import moment from 'moment';
import { randomFourDigitNumber } from '../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import { Invoices, InvoiceView } from '../../support/fragments/invoices';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import LoansPage from '../../support/fragments/loans/loansPage';
// import ConfirmItemStatusModal from '../../support/fragments/loans/confirmItemStatusModal';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UsersCard from '../../support/fragments/users/usersCard';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Checkout from '../../support/fragments/checkout/checkout';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import AppPaths from '../../support/fragments/app-paths';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UserEdit from '../../support/fragments/users/userEdit';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';

describe('Loans', () => {
  describe('Loans: Declare lost', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const ownerData = UsersOwners.getDefaultNewOwner();

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
      UsersOwners.createViaApi({
        ...ownerData,
        servicePointOwner: [
          {
            value: testData.servicePoint.id,
            label: testData.servicePoint.name,
          },
        ],
      }).then((ownerResponse) => {
        testData.ownerId = ownerResponse.id;
      });
      cy.createTempUser([
        Permissions.loansView.gui,
        Permissions.loansRenew.gui,
        Permissions.loansRenewOverride.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        testData.folioInstances.forEach((itemData) => {
          Checkout.checkoutItemViaApi({
            itemBarcode: itemData.barcodes[0],
            userBarcode: testData.user.barcode,
            servicePointId: testData.servicePoint.id,
          });
        });
        UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.user.userId);

        cy.login(testData.user.username, testData.user.password);
        UserLoans.getUserLoansIdViaApi(testData.user.userId).then((userLoans) => {
          UserLoans.declareLoanLostViaApi(
            {
              servicePointId: testData.servicePoint.id,
              declaredLostDateTime: moment.utc().format(),
            },
            userLoans.loans[0].id,
          );
        });
        cy.visit(AppPaths.getOpenLoansPath(testData.user.userId));
        LoanDetails.waitLoading();
      });
    });

    // after('Delete test data', () => {
    //   // delete all test objects created in precondition if possible
    //   Users.deleteViaApi(testData.user.userId);
    // });

    it(
      'C9192 Loans: Actions while declared lost (vega) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.vega] },
      () => {
        // #1 Navigate to loan details for item that is declared lost.
        // Renew button is active.
        // Change due date button and declare lost buttons are inactive.
        // UsersSearchPane.openUserCard(testData.user.username);
        // UsersCard.viewCurrentLoans({
        //   openLoans: testData.folioInstances.length,
        //   returnedLoans: testData.folioInstances.length,
        // });
        // let selectedItem = testData.folioInstances[0];
        // UserLoans.openLoanDetails(selectedItem.barcodes[0]);
        //
        // // #2 Navigate to user's open loans (described in Preconditions section). Open action menu for loan for item that is declared lost.
        // // Renew is present.
        // // Change due date and declare lost are not present.
        // LoansPage.openActionMenuForLoan(selectedItem.barcodes[0]);
        //
        // // #3 On the user's open loans, select the loan for item that is declared lost.
        // // Renew bulk action button becomes active.
        // // Change due date bulk action button is inactive.
        // UserLoans.selectLoan(selectedItem.barcodes[0]);
        //
        // // #4 Select the loan for item with the status Checked out.
        // // Renew bulk action button remains active.
        // // Change due date bulk action button becomes active.
        // selectedItem = testData.folioInstances[1];
        // UserLoans.selectLoan(selectedItem.barcodes[0]);
        //
        // // #5 Select change due date bulk action button.
        // // Modal appears with both the checked out and declared lost items. Declared lost item displays warning: Item is declared lost.
        // UserLoans.changeDueDateBulkAction();
        //
        // // #6 Select due date, then click Save and close.
        // // Declared lost item displays alert: Failed to change due date: item is Declared lost
        // // Checked out item has due date changed to date selected.
        // UserLoans.saveAndCloseDueDateChange();
        //
        // // #7 Click Close.
        // // Modal closes.
        // UserLoans.closeDueDateChangeModal();
        //
        // // #8 Renew the loan for the item that is declared lost.
        // // Renewal fails. Failure message: Item not renewed: item is Declared lost. Override item displays.
        // UserLoans.renewLoan(selectedItem.barcodes[0]);
        //
        // // #9 Click override.
        // // Override & renew modal displays. For the declared lost item, the New due date column is populated with "New due date will be calculated automatically."
        // UserLoans.overrideRenewal();
        //
        // // #10 Select the declared lost item. Enter text in the free text box. Click override.
        // // Modal closes. Item status changes to Checked out. Due date is changed according to loan policy.
        // UserLoans.overrideAndRenewLoan(selectedItem.barcodes[0]);
      },
    );
  });
});
