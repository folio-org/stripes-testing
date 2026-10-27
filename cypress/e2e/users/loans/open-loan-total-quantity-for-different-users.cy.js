import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import Checkout from '../../../support/fragments/checkout/checkout';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import LoansPage from '../../../support/fragments/loans/loansPage';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import ConfirmItemStatusModal from '../../../support/fragments/users/loans/confirmItemStatusModal';
import UserLoans from '../../../support/fragments/users/loans/userLoans';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  describe('Loans', () => {
    const testData = {
      servicePoint: {},
      staffUser: {},
      patronA: {},
      patronB: {},
      patronC: {},
      folioInstancesForPatronA: InventoryInstances.generateFolioInstances({ count: 3 }),
      folioInstancesForPatronB: InventoryInstances.generateFolioInstances({ count: 1 }),
    };
    const claimReturnedReason = 'Reason for claim returned';

    before('Create test data', () => {
      cy.getAdminToken();
      ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
        testData.servicePoint = sp;
      });
      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstancesForPatronA,
          location,
        });
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstancesForPatronB,
          location,
        });
      });

      cy.createTempUser([]).then((userProperties) => {
        testData.patronA = userProperties;
        UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.patronA.userId);
      });
      cy.createTempUser([]).then((userProperties) => {
        testData.patronB = userProperties;
        UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.patronB.userId);
      });
      cy.createTempUser([]).then((userProperties) => {
        testData.patronC = userProperties;
      });

      cy.createTempUser([
        permissions.uiUsersView.gui,
        permissions.uiUsersViewLoans.gui,
        permissions.uiUsersLoansClaimReturned.gui,
      ]).then((userProperties) => {
        testData.staffUser = userProperties;
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          testData.staffUser.userId,
          testData.servicePoint.id,
        );
      });

      cy.wrap(null).then(() => {
        testData.folioInstancesForPatronA.forEach((instance) => {
          Checkout.checkoutItemViaApi({
            itemBarcode: instance.barcodes[0],
            servicePointId: testData.servicePoint.id,
            userBarcode: testData.patronA.barcode,
          });
        });
        testData.folioInstancesForPatronB.forEach((instance) => {
          Checkout.checkoutItemViaApi({
            itemBarcode: instance.barcodes[0],
            servicePointId: testData.servicePoint.id,
            userBarcode: testData.patronB.barcode,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      testData.folioInstancesForPatronA.forEach((instance) => {
        InventoryInstances.deleteFullInstancesByTitleViaApi(instance.title);
      });
      testData.folioInstancesForPatronB.forEach((instance) => {
        InventoryInstances.deleteFullInstancesByTitleViaApi(instance.title);
      });
      Users.deleteViaApi(testData.patronA.userId);
      Users.deleteViaApi(testData.patronB.userId);
      Users.deleteViaApi(testData.patronC.userId);
      Users.deleteViaApi(testData.staffUser.userId);
    });

    it(
      'C1504437 Open loan total quantity is displayed correctly for different users (vega)',
      { tags: ['extendedPath', 'vega', 'C1504437'] },
      () => {
        cy.login(testData.staffUser.username, testData.staffUser.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });

        // Step 1: Navigate to Patron A, open loans
        UsersSearchPane.searchByUsername(testData.patronA.username);
        UsersSearchPane.selectUserFromList(testData.patronA.username);
        Users.expandLoansAccordion();
        Users.clickOpenLoansLink();
        UserLoans.waitLoading();
        UserLoans.verifyOpenLoansTabSelected();
        UserLoans.verifyQuantityOpenLoans(3);
        UserLoans.verifyNumberOfLoans(3);
        UserLoans.checkResultsInTheRowByBarcode(
          [ITEM_STATUS_NAMES.CHECKED_OUT],
          testData.folioInstancesForPatronA[0].barcodes[0],
        );

        // Step 2: Claim returned on one loan record
        UserLoans.openActionsMenuOfLoanByBarcode(testData.folioInstancesForPatronA[0].barcodes[0]);
        LoansPage.claimReturned();
        ConfirmItemStatusModal.confirmItemStatus(claimReturnedReason);
        UserLoans.checkResultsInTheRowByBarcode(
          [ITEM_STATUS_NAMES.CLAIMED_RETURNED],
          testData.folioInstancesForPatronA[0].barcodes[0],
        );
        UserLoans.verifyQuantityOpenAndClaimedReturnedLoans(3, 1);

        // Step 3: Close Patron A loans, navigate to Patron B, open loans
        UserLoans.closeLoansHistory();
        UsersSearchPane.searchByUsername(testData.patronB.username);
        UsersSearchPane.selectUserFromList(testData.patronB.username);
        Users.expandLoansAccordion();
        Users.clickOpenLoansLink();
        UserLoans.waitLoading();
        UserLoans.verifyOpenLoansTabSelected();
        UserLoans.verifyQuantityOpenLoans(1);
        UserLoans.verifyNumberOfLoans(1);
        UserLoans.checkResultsInTheRowByBarcode(
          [ITEM_STATUS_NAMES.CHECKED_OUT],
          testData.folioInstancesForPatronB[0].barcodes[0],
        );

        // Step 4: Close Patron B loans, navigate to Patron C, open loans
        UserLoans.closeLoansHistory();
        UsersSearchPane.searchByUsername(testData.patronC.username);
        UsersSearchPane.selectUserFromList(testData.patronC.username);
        Users.expandLoansAccordion();
        Users.clickOpenLoansLink();
        UserLoans.waitLoading();
        UserLoans.verifyOpenLoansTabSelected();
        UserLoans.verifyNoItemsInLoansPage();

        // Step 5: Close Patron C loans, navigate back to Patron A, verify updated label
        UserLoans.closeLoansHistory();
        UsersSearchPane.searchByUsername(testData.patronA.username);
        UsersSearchPane.selectUserFromList(testData.patronA.username);
        Users.expandLoansAccordion();
        Users.clickOpenLoansLink();
        UserLoans.waitLoading();
        UserLoans.verifyOpenLoansTabSelected();
        UserLoans.verifyQuantityOpenAndClaimedReturnedLoans(3, 1);
        UserLoans.verifyNumberOfLoans(3);
      },
    );
  });
});
