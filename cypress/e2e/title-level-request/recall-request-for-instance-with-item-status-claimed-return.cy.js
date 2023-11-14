import TopMenu from '../../support/fragments/topMenu';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Users from '../../support/fragments/users/users';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import Checkout from '../../support/fragments/checkout/checkout';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../support/fragments/inventory/item/inventoryItems';
import NewRequest from '../../support/fragments/requests/newRequest';
import Permissions from '../../support/dictionary/permissions';
import SettingsMenu from '../../support/fragments/settingsMenu';

describe('Title level request for claimed return item', () => {
  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  };
  let userData;
  let defaultLocation;

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Location.createViaApi(defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    // Log in as user with required permissions
    cy.createTempUser([
      Permissions.requestsAll.gui,
      Permissions.uiRequestsEdit.gui,
      Permissions.uiRequestsCreate.gui,
      Permissions.inventoryAll.gui,
      Permissions.checkinAll.gui,
    ]).then((userProperties) => {
      userData = userProperties;
      Checkout.checkoutItemViaApi({
        itemBarcode: testData.folioInstances[0].barcodes[0],
        servicePointId: testData.servicePoint.id,
        userBarcode: userData.barcode,
      }).then((resp) => {
        // Create item with 'Claimed return' status
        UserLoans.claimItemReturnedViaApi({ id: testData.folioInstances.itemIds }, resp.id);
      });
      cy.loginAsAdmin({
        path: SettingsMenu.circulationTitleLevelRequestsPath,
        waiter: TitleLevelRequests.waitLoading,
      });
      // Enable title level requests
      TitleLevelRequests.changeTitleLevelRequestsStatus('allow');
      cy.login(userData.username, userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
      });
    });
  });

  /* after('Delete test data', () => {
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      defaultLocation.institutionId,
      defaultLocation.campusId,
      defaultLocation.libraryId,
      defaultLocation.id,
    );
    Users.deleteViaApi(userData.userId);
  }); */

  it('Should not allow title level recall request for claimed return item', () => {
    InventorySearchAndFilter.searchInstanceByHRID(testData.folioInstances[0].instanceId);
    // Open new request dialog
    InventoryItems.openActions();
    InventoryItems.clickNewRequestButton();
    NewRequest.verifyTitleLevelRequestsCheckbox('checked');

    // Enter requester barcode
    NewRequest.enterRequesterBarcode(userData.barcode);

    // Error message should be displayed
    NewRequest.verifyErrorMessageForRequestTypeField(
      'None available for this title and patron combination',
    );
  });
});
