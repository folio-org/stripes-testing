import permissions from '../../support/dictionary/permissions';
import { getTestEntityValue } from '../../support/utils/stringTools';
import {
  FULFILMENT_PREFERENCES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
  ITEM_STATUS_NAMES,
} from '../../support/constants';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import Users from '../../support/fragments/users/users';
import Requests from '../../support/fragments/requests/requests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import UserEdit from '../../support/fragments/users/userEdit';
import NewRequest from '../../support/fragments/requests/newRequest';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import { DevTeams } from '../../support/dictionary';
import EditRequest from '../../support/fragments/requests/edit-request';
import SearchPane from '../../support/fragments/circulation-log/searchPane';

describe('Circulation log', () => {
  let userData;
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  const instanceData = {
    title: getTestEntityValue('InstanceCirculationLog'),
    itemBarcode: generateItemBarcode(),
  };
  const getSearchResultsData = (circAction, source) => ({
    userBarcode: userData.barcode,
    itemBarcode: instanceData.itemBarcode,
    object: 'Request',
    circAction,
    source,
  });
  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        cy.getAdminSourceRecord().then((record) => {
          testData.adminSourceRecord = record;
        });
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          testData.loanTypeId = loanTypes[0].id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: instanceData.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: instanceData.itemBarcode,
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          instanceData.instanceId = specialInstanceIds.instanceId;
          instanceData.itemId = specialInstanceIds.holdingIds[0].itemIds[0];
        });
      })
      .then(() => {
        cy.createTempUser([
          permissions.circulationLogAll.gui,
          permissions.requestsAll.gui,
          permissions.usersViewRequests.gui,
          permissions.uiUsersView.gui,
        ]).then((userProperties) => {
          userData = userProperties;
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            userData.userId,
            testData.userServicePoint.id,
          );
        });
      })
      .then(() => {
        Requests.createNewRequestViaApi({
          fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
          holdingsRecordId: testData.holdingTypeId,
          instanceId: instanceData.instanceId,
          item: { barcode: instanceData.itemBarcode },
          itemId: instanceData.itemId,
          pickupServicePointId: testData.userServicePoint.id,
          requestDate: new Date(),
          requestExpirationDate: new Date(new Date().getTime() + 86400000),
          requestLevel: REQUEST_LEVELS.ITEM,
          requestType: REQUEST_TYPES.PAGE,
          requesterId: userData.userId,
        }).then((request) => {
          testData.requestsId = request.body.id;
          cy.login(userData.username, userData.password, {
            path: TopMenu.requestsPath,
            waiter: Requests.waitLoading,
          });
        });
      });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(testData.requestsId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(instanceData.itemBarcode);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C358981 Verify that request source is correctly stored in the log (Volaris) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.volaris] },
    () => {
      Requests.findCreatedRequest(instanceData.itemBarcode);
      Requests.selectFirstRequest(instanceData.itemBarcode);
      EditRequest.openRequestEditForm();
      NewRequest.choosepickupServicePoint('Circ Desk 1');
      EditRequest.saveAndClose();
      cy.visit(TopMenu.circulationLogPath);
      SearchPane.waitLoading();
      SearchPane.searchByUserBarcode(userData.barcode);
      const createdRecords = getSearchResultsData('Created', testData.adminSourceRecord);
      SearchPane.findResultRowIndexByContent(createdRecords.circAction).then((rowIndex) => {
        SearchPane.checkResultSearch(createdRecords, rowIndex);
      });
      const editedRecords = getSearchResultsData('Edited', userData.lastName);
      SearchPane.findResultRowIndexByContent(editedRecords.circAction).then((rowIndex) => {
        SearchPane.checkResultSearch(editedRecords, rowIndex);
      });
    },
  );
});
