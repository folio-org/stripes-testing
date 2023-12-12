import moment from 'moment';

import { Permissions } from '../../support/dictionary';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import RenewConfirmationModal from '../../support/fragments/users/loans/renewConfirmationModal';
import OverrideAndRenewModal from '../../support/fragments/users/loans/overrideAndRenewModal';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import LoansPage from '../../support/fragments/loans/loansPage';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import DateTools from '../../support/utils/dateTools';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Checkout from '../../support/fragments/checkout/checkout';
import AppPaths from '../../support/fragments/app-paths';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

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
        Permissions.uiUserLoansChangeDueDate.gui,
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

        UserLoans.getUserLoansIdViaApi(testData.user.userId).then((userLoans) => {
          UserLoans.declareLoanLostViaApi(
            {
              servicePointId: testData.servicePoint.id,
              declaredLostDateTime: moment.utc().format(),
            },
            userLoans.loans[0].id,
          );
        });
        cy.login(testData.user.username, testData.user.password, {
          path: AppPaths.getOpenLoansPath(testData.user.userId),
          waiter: LoanDetails.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      testData.folioInstances.forEach((instance) => {
        CheckInActions.checkinItemViaApi({
          itemBarcode: instance.barcodes[0],
          servicePointId: testData.servicePoint.id,
          checkInDate: new Date().toISOString(),
        });
      });
      UsersOwners.deleteViaApi(ownerData.id);
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      testData.folioInstances.forEach((item) => {
        InventoryInstances.deleteInstanceViaApi({
          instance: item,
          servicePoint: testData.servicePoint,
          shouldCheckIn: true,
        });
      });
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C9192 Loans: Actions while declared lost (vega) (TaaS)',
      { tags: ['extendedPath', 'vega'] },
      () => {
        const firstItemBarcode = testData.folioInstances[0].barcodes[0];
        const secondItemBarcode = testData.folioInstances[1].barcodes[0];
        const loans = [
          {
            itemBarcode: firstItemBarcode,
            status: 'Declared lost',
            alerts: 'Failed to change due date: item is Declared lost',
            renewalStatus: 'Item not renewed:item is Declared lost',
            newDueDate: 'Due date will be calculated automatically',
          },
          {
            itemBarcode: secondItemBarcode,
            status: 'Checked out',
            alerts: 'Due date & time has successfully been changed',
          },
        ];
        // #1 Navigate to loan details for item that is declared lost.
        UserLoans.openLoanDetails(firstItemBarcode);
        LoansPage.verifyButtonsForDeclaredLostLoan();
        // #2 Navigate to user's open loans (described in Preconditions section). Open action menu for loan for item that is declared lost.
        cy.go('back');
        UserLoans.checkOptionsInActionMenu(['Renew'], firstItemBarcode);
        // #3 On the user's open loans, select the loan for item that is declared lost.
        UserLoans.checkOffLoanByBarcode(firstItemBarcode);
        UserLoans.checkRenewButton(false);
        UserLoans.checkChangeDueDateButton(true);
        // #4 Select the loan for item with the status Checked out.
        UserLoans.checkOffLoanByBarcode(secondItemBarcode);
        UserLoans.checkRenewButton(false);
        UserLoans.checkChangeDueDateButton(false);
        // #5 Select change due date bulk action button.
        UserLoans.openChangeDueDatePane();
        ChangeDueDateForm.verifyLoans(loans);
        ChangeDueDateForm.verifyWarning('Item is Declared lost');
        // #6 Select due date, then click Save and close.
        const loanDueDateAfterChanged = DateTools.getCurrentEndOfDay().add(1, 'day');
        ChangeDueDateForm.fillDate(loanDueDateAfterChanged.format('MM/DD/YYYY'));
        ChangeDueDateForm.clickSaveAndCloseButton();
        ChangeDueDateForm.verifyDueDateChangedAlerts(loans);
        // #7 Click Close.
        ChangeDueDateForm.clickCloseButton();
        // #8 Renew the loan for the item that is declared lost.
        UserLoans.checkOffLoanByBarcode(secondItemBarcode);
        UserLoans.clickRenewButton();
        RenewConfirmationModal.verifyRenewalStatus([loans[0]]);
        // #9 Click override.
        RenewConfirmationModal.confirmRenewOverrideItem();
        OverrideAndRenewModal.verifyNewDueDate(loans[0]);
        // #10 Select the declared lost item. Enter text in the free text box. Click override.
        OverrideAndRenewModal.confirmOverrideItem();
        OverrideAndRenewModal.verifyModalIsClosed();
        UserLoans.openLoanDetails(firstItemBarcode);
        LoansPage.checkItemStatus(ITEM_STATUS_NAMES.CHECKED_OUT);
      },
    );
  });
});
