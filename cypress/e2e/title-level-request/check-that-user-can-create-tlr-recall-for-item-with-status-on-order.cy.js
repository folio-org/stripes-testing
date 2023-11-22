import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { getTestEntityValue } from '../../support/utils/stringTools';
import NewRequest from '../../support/fragments/requests/newRequest';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import Requests from '../../support/fragments/requests/requests';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import generateUniqueItemBarcodeWithShift from '../../support/utils/generateUniqueItemBarcodeWithShift';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

describe('Title level Request', () => {
  const users = {
    mainUser: {},
  };
  const instanceData = {
    title: getTestEntityValue('Instance'),
    itemBarcode: generateUniqueItemBarcodeWithShift(),
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        cy.loginAsAdmin({
          path: SettingsMenu.circulationTitleLevelRequestsPath,
          waiter: TitleLevelRequests.waitLoading,
        });
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
              status: { name: ITEM_STATUS_NAMES.ON_ORDER },
              permanentLoanType: { id: instanceData.loanTypeId },
              materialType: { id: instanceData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;
        });
      })
      .then(() => {
        cy.createTempUser([
          permissions.uiRequestsView.gui,
          permissions.uiRequestsCreate.gui,
          permissions.uiRequestsAll.gui,
          permissions.uiRequestsEdit.gui,
          permissions.checkinAll.gui,
          permissions.inventoryAll.gui,
        ]).then((userPropertiesForMainUser) => {
          users.mainUser = userPropertiesForMainUser;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            users.mainUser.userId,
            testData.userServicePoint.id,
          );
        });
      })
      .then(() => {
        TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
        cy.login(users.mainUser.username, users.mainUser.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
  });

  after('Deleting created entities', () => {
    cy.loginAsAdmin({
      path: SettingsMenu.circulationTitleLevelRequestsPath,
      waiter: TitleLevelRequests.waitLoading,
    });
    Requests.getRequestApi({ query: `(instance.title=="${instanceData.title}")` }).then(
      (requestResponse) => {
        cy.wrap(requestResponse).each((request) => {
          Requests.deleteRequestViaApi(request.id);
        });
      },
    );
    CheckInActions.checkinItemViaApi({
      itemBarcode: instanceData.itemBarcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instanceData.itemBarcode);
    UserEdit.changeServicePointPreferenceViaApi(users.mainUser.userId, [
      testData.userServicePoint.id,
    ]);
    Users.deleteViaApi(users.mainUser.userId);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    TitleLevelRequests.changeTitleLevelRequestsStatus('forbid');
  });

  it(
    'C375942 - Check that user can create a TLR Recall for Item with status On order (vega) (Taas)',
    { tags: [testTypes.extendedPath, devTeams.vega] },
    () => {
      InventorySearchAndFilter.searchInstanceByTitle(instanceData.title);
      InventoryInstance.checkNewRequestAtNewPane();
      NewRequest.verifyHridInformation([instanceData.title]);

      NewRequest.enterRequesterInfoWithRequestType(
        {
          requesterBarcode: users.mainUser.barcode,
          pickupServicePoint: 'Circ Desk 1',
        },
        REQUEST_TYPES.RECALL,
      );
      NewRequest.saveRequestAndClose();
      NewRequest.waitLoading();
      NewRequest.verifyRequestSuccessfullyCreated(users.mainUser.username);
      RequestDetail.waitLoading();
      RequestDetail.checkTitleInformation({
        TLRs: '1',
        title: instanceData.title,
      });
    },
  );
});
