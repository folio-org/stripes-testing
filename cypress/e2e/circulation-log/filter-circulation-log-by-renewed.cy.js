import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import TopMenu from '../../support/fragments/topMenu';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import Users from '../../support/fragments/users/users';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';

const testData = {
  folioInstances: InventoryInstances.generateFolioInstances(),
  servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
  requestsId: '',
};
let userData;
let ITEM_BARCODE;

describe('Circulation log', () => {
  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint);
    testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
    Locations.createViaApi(testData.defaultLocation).then((location) => {
      InventoryInstances.createFolioInstancesViaApi({
        folioInstances: testData.folioInstances,
        location,
      });
    });
    cy.createTempUser([
      Permissions.circulationLogAll.gui,
      Permissions.uiInventoryViewCreateEditItems.gui,
      Permissions.uiUserEdit.gui,
      Permissions.loansRenew.gui,
      Permissions.loansView.gui,
    ])
      .then((userProperties) => {
        userData = userProperties;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);
        ITEM_BARCODE = testData.folioInstances[0].barcodes[0];
        Checkout.checkoutItemViaApi({
          itemBarcode: ITEM_BARCODE,
          servicePointId: testData.servicePoint.id,
          userBarcode: userData.barcode,
        });

        cy.login(userData.username, userData.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
        // User is on the User record 3rd pane.
        UsersSearchPane.searchByKeywords(userData.username);
        UsersSearchPane.selectUserFromList(userData.username);
      });
  });

  after('Delete test data', () => {
    CheckInActions.checkinItemViaApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId: testData.servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint: testData.servicePoint,
      shouldCheckIn: true,
    });
    Locations.deleteViaApi(testData.defaultLocation);
  });

  it(
    'C17005 Filter circulation log by renewed (firebird) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.firebird] },
    () => {
      const searchResultsData = {
        userBarcode: userData.barcode,
        itemBarcode: ITEM_BARCODE,
        object: 'Loan',
        circAction: 'Renewed',
        servicePoint: testData.servicePoint.name,
        source: 'ADMINISTRATOR, Diku_admin',
      };
      // Expand the Loans section
      UsersCard.viewCurrentLoans();
      UserLoans.checkResultsInTheRowByBarcode([ITEM_STATUS_NAMES.CHECKED_OUT], ITEM_BARCODE);
      // Open loans details
      UserLoans.openLoanDetails(ITEM_BARCODE);
      // Click Renew button in the top left corner
      UserLoans.renewItem(ITEM_BARCODE, true);
      LoanDetails.checkAction(0, 'Renewed');
      // Open the Circulation log app
      cy.visit(TopMenu.circulationLogPath);
      SearchPane.waitLoading();
      // Check Renewed checkbox from "Loan" filter
      SearchPane.setFilterOptionFromAccordion('loan', 'Renewed');
      // The renewed item should appear in the "Circulation log" table, with renewed in the "Circ action" column
      SearchPane.findResultRowIndexByContent(searchResultsData.servicePoint).then((rowIndex) => {
        SearchPane.checkResultSearch(searchResultsData, rowIndex);
      });
      // Click Reset all at the top left of the screen
      SearchPane.resetResults();
      // Search item by barcode
      SearchPane.searchByItemBarcode(ITEM_BARCODE);
      // The renewed item should appear in the "Circulation log" table, with renewed in the "Circ action" column
      SearchPane.findResultRowIndexByContent(searchResultsData.circAction).then((rowIndex) => {
        SearchPane.checkResultSearch(searchResultsData, rowIndex);
      });
    },
  );
});
