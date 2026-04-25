import uuid from 'uuid';
import moment from 'moment';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ChangeDueDateForm from '../../support/fragments/loans/changeDueDateForm';
import LoansPage from '../../support/fragments/loans/loansPage';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import UserEdit from '../../support/fragments/users/userEdit';
import Checkout from '../../support/fragments/checkout/checkout';
import AppPaths from '../../support/fragments/app-paths';
import Users from '../../support/fragments/users/users';

describe('Loans', () => {
  describe('Loans: Action menu options', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances(),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const feeFineType = {};
    const ownerData = UsersOwners.getDefaultNewOwner();
    let userData;
    let itemBarcode;

    before('Create test data', () => {
      cy.getAdminToken();
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
      itemBarcode = testData.folioInstances[0].barcodes[0];

      UsersOwners.createViaApi({
        ...ownerData,
        servicePointOwner: [
          {
            value: testData.servicePoint.id,
            label: testData.servicePoint.name,
          },
        ],
      }).then((ownerResponse) => {
        ownerData.id = ownerResponse.id;
        ownerData.name = ownerResponse.owner;

        ManualCharges.createViaApi({
          ...ManualCharges.defaultFeeFineType,
          ownerId: ownerData.id,
        }).then((manualCharge) => {
          feeFineType.id = manualCharge.id;
          feeFineType.name = manualCharge.feeFineType;
          feeFineType.amount = manualCharge.amount;
        });
      });

      cy.createTempUser([
        Permissions.uiUsersViewLoans.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiUsersfeefinesView.gui,
        Permissions.loansAll.gui,
        Permissions.loansRenew.gui,
        Permissions.uiUsersDeclareItemLost.gui,
        Permissions.settingsLoanPoliciesAll.gui,
        Permissions.uiFeeFines.gui,
        Permissions.uiUserLoansChangeDueDate.gui,
      ]).then((userProperties) => {
        userData = userProperties;
        UserEdit.addServicePointViaApi(
          testData.servicePoint.id,
          userData.userId,
          testData.servicePoint.id,
        );

        Checkout.checkoutItemViaApi({
          id: uuid(),
          itemBarcode,
          loanDate: moment.utc().format(),
          servicePointId: testData.servicePoint.id,
          userBarcode: userData.barcode,
        }).then((checkoutResponse) => {
          const feeFineAccountId = uuid();
          cy.okapiRequest({
            method: 'POST',
            path: 'accounts',
            body: {
              id: feeFineAccountId,
              feeFineId: feeFineType.id,
              ownerId: ownerData.id,
              amount: feeFineType.amount,
              remaining: feeFineType.amount,
              paymentStatus: { name: 'Outstanding' },
              status: { name: 'Open' },
              userId: userData.userId,
              feeFineType: feeFineType.name,
              feeFineOwner: ownerData.name,
              itemId: checkoutResponse.itemId,
              barcode: itemBarcode,
              title: testData.folioInstances[0].instanceTitle,
              loanId: checkoutResponse.id,
            },
            isDefaultSearchParamsRequired: false,
          }).then(() => {
            cy.okapiRequest({
              method: 'POST',
              path: 'feefineactions',
              body: {
                accountId: feeFineAccountId,
                amountAction: feeFineType.amount,
                balance: feeFineType.amount,
                id: uuid(),
                userId: userData.userId,
                typeAction: feeFineType.name,
                dateAction: moment.utc().format(),
                createdAt: testData.servicePoint.id,
                source: userData.username,
              },
              isDefaultSearchParamsRequired: false,
            });
          });
        });

        cy.login(userData.username, userData.password, {
          path: AppPaths.getOpenLoansPath(userData.userId),
          waiter: () => cy.wait(2000),
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      CheckInActions.checkinItemViaApi({
        itemBarcode,
        servicePointId: testData.servicePoint.id,
      });
      NewFeeFine.getUserFeesFines(userData.userId).then((feesFines) => {
        feesFines.accounts.forEach((account) => {
          NewFeeFine.deleteFeeFineAccountViaApi(account.id);
        });
      });
      ManualCharges.deleteViaApi(feeFineType.id);
      UsersOwners.deleteViaApi(ownerData.id);
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      });
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C562 Test links to all options of ellipses menu for a line item of the loans table (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C562'] },
      () => {
        const openLoansPath = AppPaths.getOpenLoansPath(userData.userId);
        const loginToOpenLoans = () => {
          cy.login(userData.username, userData.password, {
            path: openLoansPath,
            waiter: () => cy.wait(2000),
          });
        };

        // Step 1: Open action menu for open loan and verify all expected options are displayed
        UserLoans.checkActionsMenuOptions(
          [
            { value: 'Item details', exists: true },
            { value: 'Renew', exists: true },
            { value: 'Change due date', exists: true },
            { value: 'Loan policy', exists: true },
            { value: 'New fee/fine', exists: true },
            { value: 'Fee/fine details', exists: true },
            { value: 'Declare lost', exists: true },
          ],
          itemBarcode,
        );

        // Step 2: Click "Item details" - navigates to item record in Inventory
        loginToOpenLoans();
        UserLoans.openItemRecordInInventory(itemBarcode);

        // Step 3: Click "Renew" - system attempts renewal
        loginToOpenLoans();
        UserLoans.renewItem(itemBarcode);
        UserLoans.checkColumnContentInTheRowByBarcode(itemBarcode, 'Renewal count', '1');

        // Step 4: Click "Change due date" - change due date modal opens
        loginToOpenLoans();
        UserLoans.openActionsMenuOfLoanByBarcode(itemBarcode);
        LoansPage.openChangeDueDate();
        ChangeDueDateForm.verifyChangeDueDateForm({
          title: testData.folioInstances[0].instanceTitle,
          itemStatus: 'Checked out',
          itemBarcode,
        });

        // Step 5: Click "Loan policy" - navigate to the loan policy in Settings
        loginToOpenLoans();
        UserLoans.openLoanDetails(itemBarcode);
        LoansPage.waitLoading();
        LoansPage.verifyLinkRedirectsCorrectPage({
          href: '/settings/circulation/loan-policies',
          expectedPage: 'Loan policies',
        });

        // Step 6: Click "Fee/fine details" (with 1 fine) - view fee/fine details
        loginToOpenLoans();
        UserLoans.openLoanDetails(itemBarcode);
        LoansPage.waitLoading();
        LoansPage.verifyButtonRedirectsToCorrectPage({
          title: '100.00',
          expectedPage: 'Fee/fine details',
        });

        // Step 7: Click "New fee/fine" - navigate to new fee/fine screen
        loginToOpenLoans();
        UserLoans.clickNewFeeFine(itemBarcode);
        NewFeeFine.waitLoading();
        NewFeeFine.cancel();

        // Step 8: Add second fee/fine, navigate back to loan, click "Fee/fine details" - view all open fees/fines
        loginToOpenLoans();
        UserLoans.createNewFeeFine(itemBarcode, ownerData.name, feeFineType.name);
        cy.wait(2000);
        UserLoans.openLoanDetails(itemBarcode);
        LoansPage.waitLoading();
        LoansPage.verifyButtonRedirectsToCorrectPage({
          title: '200.00',
          expectedPage: 'Fees/fines',
        });
      },
    );
  });
});
