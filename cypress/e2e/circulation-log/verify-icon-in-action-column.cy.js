import { Permissions } from '../../support/dictionary';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import SearchResults from '../../support/fragments/circulation-log/searchResults';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Circulation log', () => {
  let userData;
  let ITEM_BARCODE;

  const testData = {
    folioInstances: InventoryInstances.generateFolioInstances(),
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    requestsId: '',
  };

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.circulationLogAll.gui,
      Permissions.checkoutAll.gui,
      Permissions.uiUsersViewLoans.gui,
      Permissions.uiUsersView.gui,
    ]).then((userProperties) => {
      userData = userProperties;
      ServicePoints.createViaApi(testData.userServicePoint);
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.userServicePoint.id,
      }).location;
      Locations.createViaApi(testData.defaultLocation).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });
      UserEdit.addServicePointViaApi(
        testData.userServicePoint.id,
        userData.userId,
        testData.userServicePoint.id,
      );
      ITEM_BARCODE = testData.folioInstances[0].barcodes[0];

      Checkout.checkoutItemViaApi({
        itemBarcode: ITEM_BARCODE,
        servicePointId: testData.userServicePoint.id,
        userBarcode: userData.barcode,
      });
      cy.login(userData.username, userData.password, {
        path: TopMenu.circulationLogPath,
        waiter: SearchPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.userServicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C368490 Verify the icon "..." in "Actions" column (volaris) (TaaS)',
    { tags: ['extendedPath', 'volaris'] },
    () => {
      // On the "Loan" accordion on the "Search & filter" pane check the "Checked out" checkbox to retrieve result list with at least 1 circulation action => Click "Apply" button
      SearchPane.setFilterOptionFromAccordion('loan', 'Checked out');
      // Check the row with any completed "Checked out" action => Pay attention to the icon presented in the "Actions" column
      SearchPane.findResultRowIndexByContent(userData.barcode).then((rowIndex) => {
        SearchResults.verifyActionIconBorder(rowIndex);
      });
    },
  );
});
