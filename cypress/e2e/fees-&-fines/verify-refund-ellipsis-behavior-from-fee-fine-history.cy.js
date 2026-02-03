import uuid from 'uuid';
import moment from 'moment';

import { Permissions } from '../../support/dictionary';
import getRandomPostfix from '../../support/utils/stringTools';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PayFeeFine from '../../support/fragments/users/payFeeFine';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import RefundFeeFine from '../../support/fragments/users/refundFeeFine';
import RefundReasons from '../../support/fragments/settings/users/refundReasons';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TransferAccounts from '../../support/fragments/settings/users/transferAccounts';
import TransferFeeFine from '../../support/fragments/users/transferFeeFine';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Fees&Fines', () => {
  describe('Refund Fees/Fines', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      owner: {},
      manualCharge: {},
      paymentMethod: {},
      transferAccount: {},
      refundReason: {},
      user1: {},
      user2: {},
      user3: {},
      user3FeeFines: [],
    };
    const feeFineAmount = 10.0;

    before('Create test data', () => {
      cy.getAdminToken();

      ServicePoints.createViaApi(testData.servicePoint);

      const ownerBody = {
        owner: 'AutotestOwner' + getRandomPostfix(),
        servicePointOwner: [
          {
            value: testData.servicePoint.id,
            label: testData.servicePoint.name,
          },
        ],
      };

      UsersOwners.createViaApi(ownerBody).then((ownerResponse) => {
        testData.owner = ownerResponse;

        ManualCharges.createViaApi({
          ...ManualCharges.defaultFeeFineType,
          ownerId: testData.owner.id,
        }).then((manualCharge) => {
          testData.manualCharge = manualCharge;

          PaymentMethods.createViaApi(testData.owner.id).then((method) => {
            testData.paymentMethod = method;

            testData.transferAccount = TransferAccounts.getDefaultNewTransferAccount(
              uuid(),
              'TestTransferAccount',
              'Test transfer account',
            );
            TransferAccounts.createViaApi({
              ...testData.transferAccount,
              ownerId: testData.owner.id,
            });

            testData.refundReason = RefundReasons.getDefaultNewRefundReason(
              uuid(),
              'TestRefundReason',
              'Test refund reason',
            );
            RefundReasons.createViaApi(testData.refundReason);

            // Create User 1: No fees/fines
            cy.createTempUser([
              Permissions.uiUsersView.gui,
              Permissions.uiUsersfeefinesView.gui,
              Permissions.uiFeeFines.gui,
              Permissions.uiUsersManualCharge.gui,
              Permissions.uiUsersManualPay.gui,
              Permissions.uiFeeFinesActions.gui,
            ]).then((userProperties) => {
              testData.user1 = userProperties;
              UserEdit.addServicePointViaApi(
                testData.servicePoint.id,
                testData.user1.userId,
                testData.servicePoint.id,
              );
            });

            // Create User 2: Outstanding fee/fine
            cy.createTempUser([
              Permissions.uiUsersView.gui,
              Permissions.uiUsersfeefinesView.gui,
              Permissions.uiFeeFines.gui,
              Permissions.uiUsersManualCharge.gui,
              Permissions.uiUsersManualPay.gui,
              Permissions.uiFeeFinesActions.gui,
            ]).then((userProperties) => {
              testData.user2 = userProperties;
              UserEdit.addServicePointViaApi(
                testData.servicePoint.id,
                testData.user2.userId,
                testData.servicePoint.id,
              );

              cy.getAdminSourceRecord().then((adminSourceRecord) => {
                const feeFineAccount = {
                  id: uuid(),
                  ownerId: testData.owner.id,
                  feeFineId: testData.manualCharge.id,
                  amount: feeFineAmount,
                  userId: testData.user2.userId,
                  feeFineType: testData.manualCharge.feeFineType,
                  feeFineOwner: testData.owner.owner,
                  createdAt: testData.servicePoint.id,
                  dateAction: moment.utc().format(),
                  source: adminSourceRecord,
                };
                NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
                  testData.user2.feeFineId = feeFineAccountId;
                });
              });
            });

            // Create User 3: 5 fees/fines with various states
            cy.createTempUser([
              Permissions.uiUsersView.gui,
              Permissions.uiUsersfeefinesView.gui,
              Permissions.uiFeeFines.gui,
              Permissions.uiUsersManualCharge.gui,
              Permissions.uiUsersManualPay.gui,
              Permissions.uiFeeFinesActions.gui,
            ]).then((userProperties) => {
              testData.user3 = userProperties;
              UserEdit.addServicePointViaApi(
                testData.servicePoint.id,
                testData.user3.userId,
                testData.servicePoint.id,
              );

              cy.getAdminSourceRecord().then((adminSourceRecord) => {
                // Fee/Fine 1: Partially paid
                const feeFine1 = {
                  id: uuid(),
                  ownerId: testData.owner.id,
                  feeFineId: testData.manualCharge.id,
                  amount: feeFineAmount,
                  userId: testData.user3.userId,
                  feeFineType: testData.manualCharge.feeFineType,
                  feeFineOwner: testData.owner.owner,
                  createdAt: testData.servicePoint.id,
                  dateAction: moment.utc().format(),
                  source: adminSourceRecord,
                };
                NewFeeFine.createViaApi(feeFine1).then((accountId) => {
                  testData.user3FeeFines.push({ id: accountId, type: 'partially_paid' });
                  const payBody = {
                    amount: 5.0,
                    paymentMethod: testData.paymentMethod.name,
                    notifyPatron: false,
                    servicePointId: testData.servicePoint.id,
                    userName: adminSourceRecord,
                  };
                  PayFeeFine.payFeeFineViaApi(payBody, accountId);
                });

                // Fee/Fine 2: Partially transferred
                const feeFine2 = {
                  id: uuid(),
                  ownerId: testData.owner.id,
                  feeFineId: testData.manualCharge.id,
                  amount: feeFineAmount,
                  userId: testData.user3.userId,
                  feeFineType: testData.manualCharge.feeFineType,
                  feeFineOwner: testData.owner.owner,
                  createdAt: testData.servicePoint.id,
                  dateAction: moment.utc().format(),
                  source: adminSourceRecord,
                };
                NewFeeFine.createViaApi(feeFine2).then((accountId) => {
                  testData.user3FeeFines.push({ id: accountId, type: 'partially_transferred' });
                  const transferBody = {
                    amount: 3.0,
                    paymentMethod: testData.transferAccount.accountName,
                    notifyPatron: false,
                    servicePointId: testData.servicePoint.id,
                    userName: adminSourceRecord,
                  };
                  TransferFeeFine.transferFeeFineViaApi(transferBody, accountId);
                });

                // Fee/Fine 3: Fully paid
                const feeFine3 = {
                  id: uuid(),
                  ownerId: testData.owner.id,
                  feeFineId: testData.manualCharge.id,
                  amount: feeFineAmount,
                  userId: testData.user3.userId,
                  feeFineType: testData.manualCharge.feeFineType,
                  feeFineOwner: testData.owner.owner,
                  createdAt: testData.servicePoint.id,
                  dateAction: moment.utc().format(),
                  source: adminSourceRecord,
                };
                NewFeeFine.createViaApi(feeFine3).then((accountId) => {
                  testData.user3FeeFines.push({ id: accountId, type: 'fully_paid' });
                  const payBody = {
                    amount: feeFineAmount,
                    paymentMethod: testData.paymentMethod.name,
                    notifyPatron: false,
                    servicePointId: testData.servicePoint.id,
                    userName: adminSourceRecord,
                  };
                  PayFeeFine.payFeeFineViaApi(payBody, accountId);
                });

                // Fee/Fine 4: Fully transferred
                const feeFine4 = {
                  id: uuid(),
                  ownerId: testData.owner.id,
                  feeFineId: testData.manualCharge.id,
                  amount: feeFineAmount,
                  userId: testData.user3.userId,
                  feeFineType: testData.manualCharge.feeFineType,
                  feeFineOwner: testData.owner.owner,
                  createdAt: testData.servicePoint.id,
                  dateAction: moment.utc().format(),
                  source: adminSourceRecord,
                };
                NewFeeFine.createViaApi(feeFine4).then((accountId) => {
                  testData.user3FeeFines.push({ id: accountId, type: 'fully_transferred' });
                  const transferBody = {
                    amount: feeFineAmount,
                    paymentMethod: testData.transferAccount.accountName,
                    notifyPatron: false,
                    servicePointId: testData.servicePoint.id,
                    userName: adminSourceRecord,
                  };
                  TransferFeeFine.transferFeeFineViaApi(transferBody, accountId);
                });

                // Fee/Fine 5: Partially paid + partially transferred
                const feeFine5 = {
                  id: uuid(),
                  ownerId: testData.owner.id,
                  feeFineId: testData.manualCharge.id,
                  amount: feeFineAmount,
                  userId: testData.user3.userId,
                  feeFineType: testData.manualCharge.feeFineType,
                  feeFineOwner: testData.owner.owner,
                  createdAt: testData.servicePoint.id,
                  dateAction: moment.utc().format(),
                  source: adminSourceRecord,
                };
                NewFeeFine.createViaApi(feeFine5).then((accountId) => {
                  testData.user3FeeFines.push({ id: accountId, type: 'mixed' });
                  const payBody = {
                    amount: 4.0,
                    paymentMethod: testData.paymentMethod.name,
                    notifyPatron: false,
                    servicePointId: testData.servicePoint.id,
                    userName: adminSourceRecord,
                  };
                  PayFeeFine.payFeeFineViaApi(payBody, accountId).then(() => {
                    const transferBody = {
                      amount: 3.0,
                      paymentMethod: testData.transferAccount.accountName,
                      notifyPatron: false,
                      servicePointId: testData.servicePoint.id,
                      userName: adminSourceRecord,
                    };
                    TransferFeeFine.transferFeeFineViaApi(transferBody, accountId);
                  });
                });
              });

              cy.login(testData.user1.username, testData.user1.password, {
                path: TopMenu.usersPath,
                waiter: UsersSearchPane.waitLoading,
              });
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();

      if (testData.user2.feeFineId) {
        NewFeeFine.deleteFeeFineAccountViaApi(testData.user2.feeFineId);
      }

      testData.user3FeeFines.forEach((feeFine) => {
        NewFeeFine.deleteFeeFineAccountViaApi(feeFine.id);
      });

      RefundReasons.deleteViaApi(testData.refundReason.id);
      TransferAccounts.deleteViaApi(testData.transferAccount.id);
      PaymentMethods.deleteViaApi(testData.paymentMethod.id);
      ManualCharges.deleteViaApi(testData.manualCharge.id);
      UsersOwners.deleteViaApi(testData.owner.id);

      UserEdit.changeServicePointPreferenceViaApi(testData.user1.userId, [
        testData.servicePoint.id,
      ]);
      UserEdit.changeServicePointPreferenceViaApi(testData.user2.userId, [
        testData.servicePoint.id,
      ]);
      UserEdit.changeServicePointPreferenceViaApi(testData.user3.userId, [
        testData.servicePoint.id,
      ]);

      Users.deleteViaApi(testData.user1.userId);
      Users.deleteViaApi(testData.user2.userId);
      Users.deleteViaApi(testData.user3.userId);

      ServicePoints.deleteViaApi(testData.servicePoint.id);
    });

    it(
      'C15191 Verify behavior when "Refund" ellipsis option selected from Fee/Fine History page (vega)',
      { tags: ['extendedPath', 'vega', 'C15191'] },
      () => {
        // User 1: Patron without any fees/fines
        UsersSearchPane.searchByUsername(testData.user1.username);
        UsersSearchPane.openUser(testData.user1.username);
        UsersCard.openFeeFines(0, 0);

        // Navigate back to Users page before searching for next user
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.waitLoading();

        // User 2: Patron with fee/fine that has not been paid/transferred
        UsersSearchPane.searchByUsername(testData.user2.username);
        UsersSearchPane.openUser(testData.user2.username);
        UsersCard.openFeeFines();
        UsersCard.viewAllFeesFines();
        UserAllFeesFines.verifyPageHeader(testData.user2.username);

        // Verify Refund ellipsis option is inactive for outstanding fee/fine
        UserAllFeesFines.checkRefundEllipsisDisabled(0);

        // Navigate back to Users page before searching for next user
        cy.visit(TopMenu.usersPath);
        UsersSearchPane.waitLoading();

        // User 3: Patron with fees/fines that have been paid/transferred
        UsersSearchPane.searchByUsername(testData.user3.username);
        UsersSearchPane.openUser(testData.user3.username);
        UsersCard.openFeeFines();

        // Test all 5 fees/fines to verify Refund ellipsis option behavior
        UsersCard.viewAllFeesFines();
        UserAllFeesFines.verifyPageHeader(testData.user3.username);

        // Start with Open tab - check partially paid/transferred fees first
        UserAllFeesFines.goToOpenFeeFines();

        // Verify that 3 open fees/fines are loaded
        UserAllFeesFines.verifyFeeFineCount(3);

        // Fee/Fine 1: Partially paid - Refund should be DISABLED
        UserAllFeesFines.checkRefundEllipsisDisabled(0);

        // Fee/Fine 2: Partially transferred - Refund should be DISABLED
        UserAllFeesFines.checkRefundEllipsisDisabled(1);

        // Fee/Fine 5: Partially paid + partially transferred - Refund should be DISABLED
        UserAllFeesFines.checkRefundEllipsisDisabled(2);

        // Switch to Closed tab to test fully paid/transferred fees
        UserAllFeesFines.goToClosedFeesFines();

        // Verify that 2 closed fees/fines are loaded (fully paid and fully transferred)
        UserAllFeesFines.verifyFeeFineCount(2);

        // Fee/Fine 3: Fully paid - Refund ellipsis is also DISABLED (refund only available via Details page)
        UserAllFeesFines.checkRefundEllipsisDisabled(0);

        // Fee/Fine 4: Fully transferred - Refund ellipsis is also DISABLED
        UserAllFeesFines.checkRefundEllipsisDisabled(1);

        // To perform refund, need to open Fee/Fine Details page (not via ellipsis)
        UserAllFeesFines.clickOnRowByIndex(0);
        FeeFineDetails.waitLoading();

        // Open Actions menu and verify Refund button is available on Details page
        FeeFineDetails.openActions();
        FeeFineDetails.verifyRefundButtonState(true);

        // Perform full refund via Actions menu on Details page
        FeeFineDetails.openRefundModal();
        RefundFeeFine.waitLoading();

        // Verify modal shows correct message
        FeeFineDetails.verifyRefundModalMessage();

        RefundFeeFine.selectRefundReason(testData.refundReason.nameReason);
        RefundFeeFine.submitAndConfirm();

        // After refund, we should be back on Details page
        FeeFineDetails.waitLoading();

        // Verify Refund button is now disabled after full refund
        FeeFineDetails.openActions();
        FeeFineDetails.verifyRefundButtonState(false);

        // Close details and verify ellipsis refund is still disabled
        FeeFineDetails.closeDetails();

        // Verify we're back on fee/fine history page
        UserAllFeesFines.verifyPageHeader(testData.user3.username);

        // Verify Refund ellipsis option remains disabled after refund
        UserAllFeesFines.checkRefundEllipsisDisabled(0);
      },
    );
  });
});
