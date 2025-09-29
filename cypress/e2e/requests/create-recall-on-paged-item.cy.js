import { ITEM_STATUS_NAMES, REQUEST_LEVELS, REQUEST_TYPES } from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('C724 Create recall on paged item (vega extended)', () => {
  let userData = {};
  let requestId;
  let itemBarcode;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances({
      count: 1,
      status: ITEM_STATUS_NAMES.PAGED,
    }),
  };

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => ServicePoints.getCircDesk1ServicePointViaApi())
      .then((servicePoint) => {
        testData.servicePoint = servicePoint;
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
        Location.createViaApi(testData.defaultLocation);
      })
      .then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      })
      .then(() => cy.createTempUser([
        Permissions.uiRequestsAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiUsersView.gui,
      ]))
      .then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointsViaApi(
          [testData.servicePoint.id],
          userData.userId,
          testData.servicePoint.id,
        );
        itemBarcode = testData.folioInstances[0].barcodes[0];
        cy.login(userData.username, userData.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });
      });
  });

  after('Cleanup', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(requestId);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
      testData.folioInstances[0].barcodes[0],
    );
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C724 Create recall on paged item (vega)',
    {
      tags: ['vega', 'C724', 'extendedPath'],
    },
    () => {
      // 1. Create Recall request for paged item
      cy.waitForAuthRefresh(() => {
        NewRequest.openNewRequestPane();
        NewRequest.enterItemInfo(itemBarcode);
      });

      NewRequest.verifyItemInformation([userData.barcode, ITEM_STATUS_NAMES.PAGED]);
      NewRequest.enterRequesterBarcode(userData.barcode);
      NewRequest.verifyRequesterInformation(userData.username, userData.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.RECALL);
      NewRequest.choosePickupServicePoint(testData.servicePoint.name);
      NewRequest.saveRequestAndClose();

      RequestDetail.checkRequestInformation({
        type: REQUEST_TYPES.RECALL,
        status: 'Open - Not yet filled',
        level: REQUEST_LEVELS.ITEM,
      });
    },
  );
});
