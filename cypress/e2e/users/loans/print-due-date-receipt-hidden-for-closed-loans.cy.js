import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserLoans from '../../../support/fragments/users/loans/userLoans';
import LoanDetails from '../../../support/fragments/users/userDefaultObjects/loanDetails';
import Checkout from '../../../support/fragments/checkout/checkout';
import CheckInActions from '../../../support/fragments/check-in-actions/checkInActions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { LOCATION_NAMES } from '../../../support/constants';

describe('Users', () => {
  describe('Loans', () => {
    const testData = {
      user: {},
      servicePoint: {},
      location: {},
      folioInstances: InventoryInstances.generateFolioInstances(),
    };

    before('Create test data', () => {
      cy.getAdminToken();
      ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
        testData.servicePoint = sp;
      });
      cy.createTempUser([Permissions.uiUsersViewLoans.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
          testData.location = res;
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location: res,
          });
        });
        UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.user.userId);
        Checkout.checkoutItemViaApi({
          itemBarcode: testData.folioInstances[0].barcodes[0],
          servicePointId: testData.servicePoint.id,
          userBarcode: testData.user.barcode,
        });
        CheckInActions.checkinItemViaApi({
          itemBarcode: testData.folioInstances[0].barcodes[0],
          servicePointId: testData.servicePoint.id,
        });
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.folioInstances[0].title);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C566597 "Print Due Date Receipt" option is hidden for closed loans (volaris)',
      { tags: ['extendedPath', 'volaris', 'C566597'] },
      () => {
        // Step 1: Expand Loans accordion and click on closed loans link
        UsersSearchPane.searchByBarcode(testData.user.barcode);
        Users.expandLoansAccordion();
        Users.clickClosedLoansLink();
        LoanDetails.waitLoading();
        cy.pause();
        UserLoans.verifyClosedLoansTabSelected();
        UserLoans.verifyNumberOfLoans(1);

        // Step 2: Verify "Print Due Date Receipt" button is absent on the closed loans page
        UserLoans.verifyPrintDueDateReceiptButtonAbsent();

        // Step 3: Click "..." icon in Actions column; verify "Print Due Date Receipt" option is absent
        UserLoans.verifyPrintDueDateReceiptOptionAbsent(testData.folioInstances[0].barcodes[0]);

        // Step 4: Click on a loan record to open its details
        UserLoans.openLoanDetails(testData.folioInstances[0].barcodes[0]);
        LoanDetails.waitLoanDetailsLoading();

        // Step 5: Verify "Print Due Date Receipt" button is disabled on the closed loan details page
        LoanDetails.verifyPrintDueDateReceiptButtonDisabled();
      },
    );
  });
});
