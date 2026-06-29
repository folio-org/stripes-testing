import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import NewRequest from '../../support/fragments/requests/newRequest';
import RequestsSearchResultsPane from '../../support/fragments/requests/requestsSearchResultsPane';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

describe('Requests', () => {
  let userData = {};
  let itemBarcode;
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Location.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });

    cy.createTempUser([
      Permissions.uiRequestsAll.gui,
      Permissions.inventoryAll.gui,
      Permissions.uiTenantSettingsServicePointsCRUD.gui,
    ]).then((userProperties) => {
      userData = userProperties;
      UserEdit.addServicePointsViaApi(
        [testData.servicePoint.id],
        userData.userId,
        testData.servicePoint.id,
      );
      itemBarcode = testData.folioInstances[0].barcodes[0];
      cy.login(userData.username, userData.password, {
        path: TopMenu.requestsPath,
        waiter: RequestsSearchResultsPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
      testData.folioInstances[0].barcodes[0],
    );
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Location.deleteInstitutionCampusLibraryLocationViaApi(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
  });

  it(
    'C410741 Check the error if during the creation of request pick up location of service point was changed from "Yes" to "No" (vega)',
    { tags: ['extendedPath', 'vega', 'C410741'] },
    () => {
      // Step 1: Click on "Actions" button > select "New" action
      NewRequest.openNewRequestPane();
      NewRequest.waitLoadingNewRequestPage();
      // Ensure TLR checkbox is not checked if it is present
      NewRequest.unselectTitleLevelRequest();

      // Step 2: Enter Item barcode into "Item barcode*" field and click "Enter"
      NewRequest.enterItemInfo(itemBarcode);
      NewRequest.verifyItemInformation([itemBarcode, ITEM_STATUS_NAMES.AVAILABLE]);

      // Step 3: Enter User barcode into "Requester barcode*" field and click "Enter"
      NewRequest.enterRequesterBarcode(userData.barcode);
      NewRequest.verifyRequesterInformation(userData.username, userData.barcode);

      // Step 4: Choose request type "Page"
      NewRequest.chooseRequestType(REQUEST_TYPES.PAGE);
      cy.wait(1000);

      // Steps 5-6: Open "Pickup service point*" dropdown and select the created service point
      NewRequest.choosePickupServicePoint(testData.servicePoint.name);

      // Step 7: Make created service point not a pickup location via API
      cy.getAdminToken();
      ServicePoints.disablePickupLocationViaApi(testData.servicePoint.id);

      // Step 8: Click "Save & close" button
      NewRequest.saveRequestAndClose();

      // Expected: Red error toast "This request was not placed successfully" is displayed
      NewRequest.verifyErrorMessage('This request was not placed successfully');

      // Expected: Popup error modal "Service point is not a pickup location" is displayed
      NewRequest.checkServicePointNotPickupLocationModal();

      // Expected: Validation error (HTTP status 422) with error text and code
      NewRequest.verifyPickupLocationValidationError();
    },
  );
});
