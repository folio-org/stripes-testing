import uuid from 'uuid';

import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import CancelFeeFine from '../../support/fragments/users/cancelFeeFine';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import RefundReasons from '../../support/fragments/settings/users/refundReasons';
import RefundFeeFine from '../../support/fragments/users/refundFeeFine';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import Permissions from '../../support/dictionary/permissions';
import PayFeeFine from '../../support/fragments/users/payFeeFine';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import UsersCard from '../../support/fragments/users/usersCard';
import UserEdit from '../../support/fragments/users/userEdit';
import AppPaths from '../../support/fragments/app-paths';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Fees&Fines', () => {
  describe('Cancel Fees/Fines', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      refundReasonId: uuid(),
    };
    const feeFineType = {};
    const ownerBody = {
      owner: 'AutotestOwner' + getRandomPostfix(),
      servicePointOwner: [
        {
          value: testData.servicePoint.id,
          label: testData.servicePoint.name,
        },
      ],
    };

    before('Create test data', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.servicePoint);
      UsersOwners.createViaApi(ownerBody).then((ownerResponse) => {
        testData.ownerId = ownerResponse.id;
        testData.owner = ownerResponse.owner;

        ManualCharges.createViaApi({
          ...ManualCharges.defaultFeeFineType,
          ownerId: testData.ownerId,
        }).then((manualCharge) => {
          feeFineType.id = manualCharge.id;
          feeFineType.amount = manualCharge.amount;

          PaymentMethods.createViaApi(testData.ownerId).then((method) => {
            testData.paymentMethod = method;

            RefundReasons.createViaApi(
              RefundReasons.getDefaultNewRefundReason(testData.refundReasonId),
            ).then((reason) => {
              testData.refundReason = reason.body;
            });

            cy.createTempUser([
              Permissions.loansAll.gui,
              Permissions.loansView.gui,
              Permissions.loansRenewOverride.gui,
              Permissions.loansRenew.gui,
              Permissions.uiFeeFines.gui,
              Permissions.uiUsersfeefinesView.gui,
              Permissions.uiUsersView.gui,
            ])
              .then((userProperties) => {
                testData.user = userProperties;
              })
              .then(() => {
                UserEdit.addServicePointViaApi(
                  testData.servicePoint.id,
                  testData.user.userId,
                  testData.servicePoint.id,
                );

                cy.login(testData.user.username, testData.user.password, {
                  path: TopMenu.usersPath,
                  waiter: UsersSearchPane.waitLoading,
                });
                UsersSearchPane.searchByKeywords(testData.user.username);
                UsersSearchPane.openUser(testData.user.username);
                UsersCard.openFeeFines();
                UsersCard.startFeeFineAdding();
                NewFeeFine.setFeeFineOwner(ownerBody.owner);
                NewFeeFine.checkFilteredFeeFineType(manualCharge.feeFineType);
                NewFeeFine.setFeeFineType(manualCharge.feeFineType);
                NewFeeFine.chargeOnly();
                UsersSearchPane.waitLoading();
              });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
      RefundReasons.deleteViaApi(testData.refundReason.id);
      PaymentMethods.deleteViaApi(testData.paymentMethod.id);
      ManualCharges.deleteViaApi(feeFineType.id);
      UsersOwners.deleteViaApi(testData.ownerId);
    });

    it(
      'C356793 Verify that library staff can cancel a fee/fine as an error for a patron if fee/fine has been fully paid and then fully refunded (vega) (TaaS)',
      { tags: ['extendedPath', 'vega', 'C356793'] },
      () => {
        // Click on "Fees/fines" accordion
        UsersCard.openFeeFines();
        UsersCard.verifyOpenedFeeFines(1, feeFineType.amount);
        // Click on " open fee/fine" link
        UsersCard.showOpenedFeeFines();
        UserAllFeesFines.verifyPageHeader(testData.user.username);
        // Select created fee/fine and click "Pay" button
        UserAllFeesFines.clickRowCheckbox(0);
        UserAllFeesFines.paySelectedFeeFines();
        UserAllFeesFines.verifyPayModalIsOpen();
        PayFeeFine.checkAmount(feeFineType.amount);
        // Select Payment method and click "Pay" button
        PayFeeFine.setPaymentMethod(testData.paymentMethod);
        // Click "Confirm" button
        PayFeeFine.submitAndConfirm();
        PayFeeFine.checkConfirmModalClosed();
        UserAllFeesFines.verifyPageHeader(testData.user.username);
        // Switch to "Closed" tab
        UserAllFeesFines.goToClosedFeesFines();
        // Select just paid fee/fine and click "Refund" button
        UserAllFeesFines.clickOnRowByIndex(0);
        // Select Refund reason and click "Refund" button
        UserAllFeesFines.refundSelectedFeeFines();
        RefundFeeFine.waitLoading();
        // Select Refund reason and click "Refund" button
        RefundFeeFine.selectRefundReason(testData.refundReason.nameReason);
        // Click "Refund" and "Confirm" button
        RefundFeeFine.submitAndConfirm();
        // Switch to "Open" tab
        cy.visit(AppPaths.getOpenFeeFinePath(testData.user.userId));
        // Select the just Refunded fee/fine, click on "..." button and select "Error" action
        UserAllFeesFines.cancelSelectedFeeFines(0);
        CancelFeeFine.waitLoading();
        // Fill in "Additional information for staff*" field and click "Confirm" button
        CancelFeeFine.fillInAdditionalInformationAndConfirm(getTestEntityValue('comment'));
        UserAllFeesFines.goToClosedFeesFines();
        UserAllFeesFines.verifyPaymentStatus(0, 'Cancelled as error');
      },
    );
  });
});
