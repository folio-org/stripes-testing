import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import EditRequest from '../../support/fragments/requests/edit-request';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestDetail from '../../support/fragments/requests/requestDetail';
import Requests from '../../support/fragments/requests/requests';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Requests', () => {
  let userData = {};
  let requestId;
  let itemBarcode;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  before('Preconditions', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Location.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });

    cy.createTempUser([Permissions.uiRequestsAll.gui, Permissions.inventoryAll.gui]).then(
      (userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointsViaApi(
          [testData.servicePoint.id],
          userData.userId,
          testData.servicePoint.id,
        );
        itemBarcode = testData.folioInstances[0].barcodes[0];
        cy.login(userData.username, userData.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Requests.deleteRequestViaApi(requestId);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(itemBarcode);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C551 Once item is selected, check that the item metadata displaying is accurate (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C551'] },
    () => {
      const instanceTitle = testData.folioInstances[0].instanceTitle;

      // Step 1-2: Search for item in Inventory and open item record
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', itemBarcode);
      ItemRecordView.waitLoading();

      // Step 3: Create new request from item Actions menu
      ItemRecordView.createNewRequest();
      NewRequest.waitLoadingNewRequestPage();

      // Step 4: Verify item information is pre-populated accurately in Create mode
      NewRequest.verifyItemInformation([
        itemBarcode,
        instanceTitle,
        testData.defaultLocation.name,
        ITEM_STATUS_NAMES.AVAILABLE,
      ]);

      // Step 5: Verify item link works from Create request page
      // Click item link, confirm Close without saving, verify item record, re-create request
      NewRequest.openItemByBarcode(itemBarcode);
      NewRequest.confirmCloseWithoutSaving();
      cy.visit(TopMenu.inventoryPath);
      InventorySearchAndFilter.waitLoading();
      InventorySearchAndFilter.switchToItem();
      InventorySearchAndFilter.searchByParameter('Barcode', itemBarcode);
      ItemRecordView.waitLoading();

      // Re-create request from item Actions menu (repeat Step 3)
      ItemRecordView.createNewRequest();
      NewRequest.waitLoadingNewRequestPage();

      // Step 6: Enter requester and save request
      NewRequest.enterRequesterBarcode(userData.barcode);
      NewRequest.verifyRequesterInformation(userData.username, userData.barcode);
      NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
      NewRequest.choosePickupServicePoint(testData.servicePoint.name);
      NewRequest.saveRequestAndClose();
      cy.wait('@createRequest').then((intercept) => {
        requestId = intercept.response.body.id;
        cy.location('pathname').should('eq', `/requests/view/${requestId}`);
      });

      // Step 7: Verify item information in Request Detail view mode
      RequestDetail.waitLoading('no staff');
      RequestDetail.checkItemInformation({
        itemBarcode,
        title: instanceTitle,
        effectiveLocation: testData.defaultLocation.name,
        itemStatus: ITEM_STATUS_NAMES.PAGED,
        requestsOnItem: '1',
      });

      // Step 8: Verify item link works from Request Detail view
      cy.wait(3000);
      RequestDetail.openItemByBarcode(itemBarcode);
      cy.wait(1000);
      ItemRecordView.waitLoading();

      // Navigate back to request detail using page object pattern
      ItemRecordView.openRequest();
      Requests.waitLoading();
      Requests.selectFirstRequest(instanceTitle);
      RequestDetail.waitLoading('no staff');

      // Step 9: Open Edit request form
      EditRequest.openRequestEditForm();
      EditRequest.waitLoading('item');

      // Step 10: Verify item information in Edit mode
      EditRequest.verifyItemInformation({
        itemBarcode,
        effectiveLocation: testData.defaultLocation.name,
        itemStatus: ITEM_STATUS_NAMES.PAGED,
        title: instanceTitle,
        requestsOnItem: '1',
      });

      // Step 11: Verify item barcode link exists in Edit request page
      EditRequest.verifyItemBarcodeLink(itemBarcode);
    },
  );
});
