import uuid from 'uuid';
import moment from 'moment';

import { Permissions } from '../../support/dictionary';
import getRandomPostfix from '../../support/utils/stringTools';
import { NOTICE_CATEGORIES } from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticeTemplates from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
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
  describe('Refund fee/fine with notice', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      owner: {},
      manualCharge: {},
      paymentMethod: {},
      refundReason: {},
      patronNoticeTemplate: {},
      user: {},
      feeFineAccountId: null,
    };
    const feeFineAmount = 10.0;

    before('Create test data', () => {
      cy.getAdminToken();

      ServicePoints.createViaApi(testData.servicePoint);

      const patronNoticeTemplate = {
        id: uuid(),
        category: NOTICE_CATEGORIES.FeeFineAction.requestId,
        active: true,
        name: `ActionNoticeTemplate_${getRandomPostfix()}`,
        description: 'Fee/fine action notice template for C15193',
        localizedTemplates: {
          en: {
            header: 'Fee/fine refund notice',
            body: '<div>Your fee/fine has been refunded</div>',
          },
        },
        body: '<div>Your fee/fine has been refunded</div>',
        header: 'Fee/fine refund notice',
        outputFormats: ['text/html'],
        0: 'text/html',
        templateResolver: 'mustache',
      };

      NoticeTemplates.createViaApi(patronNoticeTemplate).then(() => {
        testData.patronNoticeTemplate = patronNoticeTemplate;

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
            actionNoticeId: testData.patronNoticeTemplate.id,
          }).then((manualCharge) => {
            testData.manualCharge = manualCharge;

            PaymentMethods.createViaApi(testData.owner.id).then((method) => {
              testData.paymentMethod = method;

              testData.refundReason = RefundReasons.getDefaultNewRefundReason(
                uuid(),
                'TestRefundReason' + getRandomPostfix(),
                'Test refund reason for C15193',
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
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      if (testData.feeFineAccountId) {
        NewFeeFine.deleteFeeFineAccountViaApi(testData.feeFineAccountId);
      }
      RefundReasons.deleteViaApi(testData.refundReason.id);
      PaymentMethods.deleteViaApi(testData.paymentMethod.id);
      ManualCharges.deleteViaApi(testData.manualCharge.id);
      NoticeTemplates.deleteViaApi(testData.patronNoticeTemplate.id);
      UsersOwners.deleteViaApi(testData.owner.id);
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C15193 Verify "Refund fee/fine" behavior when fee/fine owner has action notice set (vega)',
      { tags: ['extendedPath', 'vega', 'C15193'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });

        UsersSearchPane.searchByUsername(testData.user.username);
        UsersSearchPane.selectUserFromList(testData.user.username);
        UsersCard.waitLoading();

        UsersCard.openFeeFines();
        UsersCard.viewAllFeesFines();

        UserAllFeesFines.goToClosedFeesFines();
        cy.wait(500);

        UserAllFeesFines.clickOnRowByIndex(0);
        FeeFineDetails.waitLoading();

        FeeFineDetails.openActions();
        FeeFineDetails.openRefundModal();

        RefundFeeFine.waitLoading();
        RefundFeeFine.verifyNotifyPatronPresent();
        RefundFeeFine.verifyAdditionalInfoPresent();
        RefundFeeFine.verifyNotifyPatronChecked(true);

        RefundFeeFine.setAdditionalInfoForPatron('Refund processed with patron notification');
        RefundFeeFine.selectRefundReason(testData.refundReason.nameReason);

        // Intercept refund API request to wait for completion
        cy.intercept('POST', '**/accounts/*/refund').as('refundRequest');
        RefundFeeFine.submitAndConfirm();
        cy.wait('@refundRequest');

        FeeFineDetails.waitLoading();

        // Verify refund button is disabled after successful refund
        FeeFineDetails.openActions();
        FeeFineDetails.verifyRefundButtonState(false);

        // Close details and verify payment status
        FeeFineDetails.closeDetails();
        cy.wait(500);

        // Verify the fee/fine shows as refunded
        UserAllFeesFines.verifyPaymentStatus(0, 'Refunded fully');
      },
    );
  });
});
