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
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Fees&Fines', () => {
  describe('Refund fee/fine without notice', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      owner: {},
      manualCharge: {},
      paymentMethod: {},
      refundReason: {},
      user: {},
      feeFineAccountId: null,
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
          automatic: false,
        }).then((manualCharge) => {
          testData.manualCharge = manualCharge;

          PaymentMethods.createViaApi(testData.owner.id).then((method) => {
            testData.paymentMethod = method;

            testData.refundReason = RefundReasons.getDefaultNewRefundReason(
              uuid(),
              'TestRefundReason' + getRandomPostfix(),
              'Test refund reason for C15192',
            );
            RefundReasons.createViaApi(testData.refundReason);

            cy.createTempUser([
              Permissions.uiUsersView.gui,
              Permissions.uiUsersfeefinesView.gui,
              Permissions.uiFeeFines.gui,
              Permissions.uiUsersManualCharge.gui,
              Permissions.uiUsersManualPay.gui,
              Permissions.uiFeeFinesActions.gui,
            ]).then((userProperties) => {
              testData.user = userProperties;

              UserEdit.addServicePointViaApi(
                testData.servicePoint.id,
                testData.user.userId,
                testData.servicePoint.id,
              );

              cy.getAdminSourceRecord().then((adminSourceRecord) => {
                const feeFineAccount = {
                  id: uuid(),
                  ownerId: testData.owner.id,
                  feeFineId: testData.manualCharge.id,
                  amount: feeFineAmount,
                  userId: testData.user.userId,
                  feeFineType: testData.manualCharge.feeFineType,
                  feeFineOwner: testData.owner.owner,
                  createdAt: testData.servicePoint.id,
                  dateAction: moment.utc().format(),
                  source: adminSourceRecord,
                };

                NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
                  testData.feeFineAccountId = feeFineAccountId;

                  const payBody = {
                    amount: feeFineAmount,
                    paymentMethod: testData.paymentMethod.name,
                    notifyPatron: false,
                    servicePointId: testData.servicePoint.id,
                    userName: adminSourceRecord,
                  };

                  PayFeeFine.payFeeFineViaApi(payBody, testData.feeFineAccountId);
                });
              });
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      if (testData.feeFineAccountId) {
        NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineAccountId);
      }
      RefundReasons.deleteViaApi(testData.refundReason.id);
      PaymentMethods.deleteViaApi(testData.paymentMethod.id);
      ManualCharges.deleteViaApi(testData.manualCharge.id);
      UsersOwners.deleteViaApi(testData.owner.id);
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C15192 Verify "Refund fee/fine" behavior when fee/fine owner does not have default or fee/fine type action notice set (vega)',
      { tags: ['extendedPath', 'vega', 'C15192'] },
      () => {
        // Login as the test user
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });

        // Step 1: Navigate to the patron's Fee/Fine Details
        UsersSearchPane.searchByUsername(testData.user.username);
        UsersSearchPane.selectUserFromList(testData.user.username);
        UsersCard.waitLoading();

        // Open fees/fines accordion and navigate to all fees/fines page
        UsersCard.openFeeFines();
        UsersCard.viewAllFeesFines();

        // Navigate to Closed tab (fee/fine was paid, so it's closed)
        UserAllFeesFines.goToClosedFeesFines();
        cy.wait(500);

        // Open the fee/fine details
        UserAllFeesFines.clickOnRowByIndex(0);
        FeeFineDetails.waitLoading();

        // Step 2: Choose the Refund option in the Actions menu
        FeeFineDetails.openActions();
        FeeFineDetails.openRefundModal();

        // Step 3: Verify "Notify patron" and "Additional information for patron" options are NOT present
        RefundFeeFine.waitLoading();
        RefundFeeFine.verifyNotifyPatronNotPresent();
        RefundFeeFine.verifyAdditionalInfoNotPresent();

        // Step 4: Enter the fields required to refund the entire amount
        RefundFeeFine.selectRefundReason(testData.refundReason.nameReason);

        // Submit the refund
        RefundFeeFine.submitAndConfirm();

        // Verify refund was successful by checking button state
        FeeFineDetails.waitLoading();
        FeeFineDetails.openActions();
        FeeFineDetails.verifyRefundButtonState(false);

        // Close details and verify payment status
        FeeFineDetails.closeDetails();
        cy.wait(500);

        // Expected result: No notice was sent (verified by absence of notify options)
        // Verify the fee/fine shows as refunded
        UserAllFeesFines.verifyPaymentStatus(0, 'Refunded fully');
      },
    );
  });
});
