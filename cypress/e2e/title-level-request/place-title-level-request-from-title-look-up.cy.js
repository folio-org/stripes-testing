import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../support/constants';
import permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import EditRequest from '../../support/fragments/requests/edit-request';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import SelectInstanceModal from '../../support/fragments/requests/selectInstanceModal';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Title Level Request', () => {
  let userData = {};
  const instanceData = {
    title: getTestEntityValue('Instance'),
    itemBarcode: generateItemBarcode(),
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          instanceData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          instanceData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          instanceData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          instanceData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceData.instanceTypeId,
            title: instanceData.title,
          },
          holdings: [
            {
              holdingsTypeId: instanceData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: instanceData.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: instanceData.loanTypeId },
              materialType: { id: instanceData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;
        });
      });

    cy.createTempUser([
      permissions.uiRequestsView.gui,
      permissions.uiRequestsCreate.gui,
      permissions.uiRequestsAll.gui,
      permissions.uiRequestsEdit.gui,
      permissions.uiUsersView.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      userData = userProperties;
      userData.patronGroup = userProperties.userGroup.group;
      userData.fullName = `${userData.username}, ${Users.defaultUser.personal.firstName} ${Users.defaultUser.personal.middleName}`;
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userData.userId,
        testData.userServicePoint.id,
      );
      cy.wait(3000);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"id"=="${instanceData.instanceId}"`,
      }).then((instance) => {
        instanceData.instanceHRID = instance.hrid;
      });
      TitleLevelRequests.enableTLRViaApi();
      cy.login(userData.username, userData.password, {
        path: TopMenu.requestsPath,
        waiter: Requests.waitLoading,
      });
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Requests.getRequestApi({ query: `(instance.title=="${instanceData.title}")` }).then(
      (requestResponse) => {
        cy.wrap(requestResponse).each((request) => {
          Requests.deleteRequestViaApi(request.id);
        });
      },
    );
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instanceData.itemBarcode);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });
  it(
    'C353599 C353600 Place title level request from title look-up (vega)',
    { tags: ['extendedPath', 'vega'] },
    () => {
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage();
      NewRequest.enableTitleLevelRequest();
      NewRequest.openTitleLookUp();
      SelectInstanceModal.waitLoading();
      SelectInstanceModal.searchByTitle(instanceData.title);
      SelectInstanceModal.selectTheFirstInstance();
      NewRequest.enterRequesterBarcode(userData.barcode);
      NewRequest.verifyRequesterInformation(userData.username, userData.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
      NewRequest.choosePickupServicePoint(testData.userServicePoint.name);
      NewRequest.saveRequestAndClose();
      NewRequest.verifyRequestSuccessfullyCreated(userData.username);
      RequestDetail.checkTitleInformation({
        TLRs: '1',
        title: instanceData.title,
      });
      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.PAGE,
        status: EditRequest.requestStatuses.NOT_YET_FILLED,
        level: REQUEST_LEVELS.TITLE,
      });
      RequestDetail.checkRequesterInformation({
        lastName: userData.fullName,
        barcode: userData.barcode,
        group: userData.patronGroup,
        preference: FULFILMENT_PREFERENCES.HOLD_SHELF,
        pickupSP: testData.userServicePoint.name,
      });
    },
  );
});
