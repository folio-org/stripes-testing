import {
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  LOCATION_IDS,
  LOCATION_NAMES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import Checkout from '../../support/fragments/checkout/checkout';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';

const testData = {
  folioInstances: InventoryInstances.generateFolioInstances(),
  requestsId: '',
};
let userData;
let ITEM_BARCODE;
let servicePoint;

describe('Circulation log', () => {
  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
      servicePoint = sp;
    });
    InventoryInstances.createFolioInstancesViaApi({
      folioInstances: testData.folioInstances,
      location: { id: LOCATION_IDS.MAIN_LIBRARY, name: LOCATION_NAMES.MAIN_LIBRARY },
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
        UserEdit.addServicePointViaApi(servicePoint.id, userData.userId);
        ITEM_BARCODE = testData.folioInstances[0].barcodes[0];
        Checkout.checkoutItemViaApi({
          itemBarcode: ITEM_BARCODE,
          servicePointId: servicePoint.id,
          userBarcode: userData.barcode,
        });

        cy.getAdminSourceRecord().then((record) => {
          testData.adminSourceRecord = record;
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
    cy.getAdminToken();
    CheckInActions.checkinItemViaApi({
      itemBarcode: ITEM_BARCODE,
      servicePointId: servicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    Users.deleteViaApi(userData.userId);
    InventoryInstances.deleteInstanceViaApi({
      instance: testData.folioInstances[0],
      servicePoint,
      shouldCheckIn: true,
    });
  });

  it(
    'C17005 Filter circulation log by renewed (volaris) (TaaS)',
    { tags: ['criticalPath', 'volaris', 'C17005'] },
    () => {
      const searchResultsData = {
        userBarcode: userData.barcode,
        itemBarcode: ITEM_BARCODE,
        object: 'Loan',
        circAction: 'Renewed',
        servicePoint: servicePoint.name,
        source: testData.adminSourceRecord,
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
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CIRCULATION_LOG);
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
