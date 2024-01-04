import moment from 'moment';

import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import RenewConfirmationModal from '../../support/fragments/users/loans/renewConfirmationModal';
import { ITEM_STATUS_NAMES } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import { Permissions } from '../../support/dictionary';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import UsersCard from '../../support/fragments/users/usersCard';
import DateTools from '../../support/utils/dateTools';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import AppPaths from '../../support/fragments/app-paths';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Loans', () => {
  describe('Loans: Claim returned', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    let firstItemBarcode;
    let secondItemBarcode;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
        testData.defaultLocation = Locations.getDefaultLocation({
          servicePointId: testData.servicePoint.id,
        }).location;
        Locations.createViaApi(testData.defaultLocation).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
        });
        firstItemBarcode = testData.folioInstances[0].barcodes[0];
        secondItemBarcode = testData.folioInstances[1].barcodes[0];
      });
      cy.createTempUser([
        Permissions.loansView.gui,
        Permissions.loansRenew.gui,
        Permissions.loansRenewOverride.gui,
        Permissions.uiUserLoansChangeDueDate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          testData.user.userId,
          testData.servicePoint.id,
        );

        Checkout.checkoutItemViaApi({
          itemBarcode: firstItemBarcode,
          loanDate: moment.utc().format(),
          servicePointId: testData.servicePoint.id,
          userBarcode: testData.user.barcode,
        });
        Checkout.checkoutItemViaApi({
          itemBarcode: secondItemBarcode,
          servicePointId: testData.servicePoint.id,
          userBarcode: testData.user.barcode,
        }).then((resp) => {
          UserLoans.claimItemReturnedViaApi({ id: testData.folioInstances[1].itemIds[0] }, resp.id);
        });

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
    });

    after('Deleting created entities', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      testData.folioInstances.forEach((item) => {
        InventoryInstances.deleteInstanceViaApi({
          instance: item,
          servicePoint: testData.servicePoint,
          shouldCheckIn: true,
        });
      });
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
      Locations.deleteViaApi(testData.defaultLocation);
    });

    it(
      'C10958 Loans: Actions while Claimed returned (vega) (TaaS)',
      { tags: ['extendedPath', 'vega'] },
      () => {
        UsersSearchPane.searchByKeywords(testData.user.username);
        UsersSearchPane.openUser(testData.user.userId);
        // #1 Navigate to the user's open loans. Open action menu for claimed returned item.
        UsersCard.viewCurrentLoans();
        UserLoans.checkResultsInTheRowByBarcode([ITEM_STATUS_NAMES.CHECKED_OUT], firstItemBarcode);
        UserLoans.checkResultsInTheRowByBarcode(
          [ITEM_STATUS_NAMES.CLAIMED_RETURNED],
          secondItemBarcode,
        );

        UserLoans.checkActionsMenuOptions(
          [
            { value: 'Renew', exists: false },
            {
              value: 'Change due date',
              exists: false,
            },
          ],
          secondItemBarcode,
        );
        // #2 Navigate to loan details for the claimed returned item.
        UserLoans.openLoanDetails(secondItemBarcode);
        // Renew and change due date buttons are inactive.
        LoanDetails.checkButtonsState([
          { value: 'Renew', disabled: true },
          {
            value: 'Change due date',
            disabled: true,
          },
        ]);
        // #3 Navigate to user's open loans. Check the item that is claimed returned.
        cy.visit(AppPaths.getOpenLoansPath(testData.user.userId));
        UserLoans.checkOffLoanByBarcode(secondItemBarcode);
        // No bulk action buttons become active (export to CSV remains active).
        LoanDetails.checkButtonsState([
          { value: 'Renew', disabled: true },
          {
            value: 'Change due date',
            disabled: true,
          },
          {
            value: 'Export to CSV',
            disabled: false,
          },
        ]);
        // #4 While claimed returned item is checked, check the item that has the item status Checked out
        UserLoans.checkOffLoanByBarcode(firstItemBarcode);
        // All bulk action buttons become active.
        LoanDetails.checkButtonsState([
          { value: 'Renew', disabled: false },
          {
            value: 'Change due date',
            disabled: false,
          },
          {
            value: 'Export to CSV',
            disabled: false,
          },
        ]);
        // #5 Click the renew bulk action button.
        UserLoans.renewAllItems();
        RenewConfirmationModal.waitLoading();
        // Renew confirmation modal displays:
        // 1 item not renewed. 1 item successfully renewed.
        RenewConfirmationModal.verifyRenewConfirmationModal([
          {
            itemBarcode: secondItemBarcode,
            status: 'Item not renewed:item is Claimed returned',
          },
          {
            itemBarcode: firstItemBarcode,
            status: 'Item successfully renewed',
          },
        ]);
        // #6 Close modal. With claimed returned and checked out item checked, click the change due date bulk action button.
        const loanDueDateAfterChanged = DateTools.getCurrentEndOfDay().add(1, 'day');
        RenewConfirmationModal.closeModal();
        UserLoans.checkOffLoanByBarcode(firstItemBarcode);
        UserLoans.checkOffLoanByBarcode(secondItemBarcode);
        UserLoans.openChangeDueDatePane();
        // In the change due date modal, for the item with the item status Claim returned, the Alert details column is populated with Item is claimed returned
        ChangeDueDateForm.verifyLoans([
          {
            itemBarcode: secondItemBarcode,
            column: 'Alert details',
            alertDetails: 'Item is Claimed returned',
          },
        ]);
        // #7 Enter required information in Change due date modal. Click save and close.
        ChangeDueDateForm.fillDate(loanDueDateAfterChanged.format('MM/DD/YYYY'));
        ChangeDueDateForm.saveAndClose(false);
        // Change due date succeeds for the item with the item status checked out. For the item with the item status claimed returned, the message Due date change failed: item is Claimed returned displays in the Alert details column.
        ChangeDueDateForm.verifyLoans([
          {
            itemBarcode: secondItemBarcode,
            column: 'Alert details',
            alertDetails: 'Due date change failed: item is Claimed returned',
          },
          {
            itemBarcode: firstItemBarcode,
            column: 'Alert details',
            alertDetails: 'Due date & time has successfully been changed',
          },
        ]);
      },
    );
  });
});
