import moment from 'moment/moment';
import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TopMenu from '../../support/fragments/topMenu';
import FeeFinesDetails from '../../support/fragments/users/feeFineDetails';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PayFeeFine from '../../support/fragments/users/payFeeFine';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Fees&Fines', () => {
  describe('Pay Fees/Fines', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      ownerData: {},
    };
    const feeFineType = {};
    const paymentMethod = {};
    let userData;
    let feeFineAccount;

    before('Create test data', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.servicePoint);
      UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner())
        .then(({ id, owner }) => {
          testData.ownerData.name = owner;
          testData.ownerData.id = id;
        })
        .then(() => {
          UsersOwners.addServicePointsViaApi(testData.ownerData, [testData.servicePoint]);
          ManualCharges.createViaApi({
            ...ManualCharges.defaultFeeFineType,
            ownerId: testData.ownerData.id,
          }).then((manualCharge) => {
            feeFineType.id = manualCharge.id;
            feeFineType.name = manualCharge.feeFineType;
            feeFineType.amount = manualCharge.amount;
          });
          PaymentMethods.createViaApi(testData.ownerData.id).then(({ name, id }) => {
            paymentMethod.name = name;
            paymentMethod.id = id;
          });
        });

      cy.createTempUser([Permissions.uiUsersManualPay.gui, Permissions.uiUsersfeefinesView.gui])
        .then((userProperties) => {
          userData = userProperties;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);
          cy.getAdminSourceRecord().then((adminSourceRecord) => {
            feeFineAccount = {
              id: uuid(),
              ownerId: testData.ownerData.id,
              feeFineId: feeFineType.id,
              amount: 50,
              userId: userData.userId,
              feeFineType: feeFineType.name,
              feeFineOwner: testData.ownerData.name,
              createdAt: testData.servicePoint.id,
              dateAction: moment.utc().format(),
              source: adminSourceRecord,
            };
            NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
              feeFineAccount.id = feeFineAccountId;
            });
          });
          cy.login(userData.username, userData.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      ManualCharges.deleteViaApi(feeFineType.id);
      PaymentMethods.deleteViaApi(paymentMethod.id);
      NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
      UsersOwners.deleteViaApi(testData.ownerData.id);
      UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C494013 Check that user with "Fees/Fines: Can pay" can pay fees/fines (vega)',
      { tags: ['extendedPath', 'vega', 'C494013'] },
      () => {
        // Step 1: Click on "Fees/fines" accordion > "# open fee/fine" button
        UsersSearchPane.searchByKeywords(userData.username);
        UsersSearchPane.selectUserFromList(userData.username);
        UsersCard.waitLoading();

        UsersCard.openFeeFines();
        UsersCard.viewAllFeesFines();
        UserAllFeesFines.waitLoading();

        // Step 2: Click on fee record
        UserAllFeesFines.clickOnRowByIndex(0);
        FeeFinesDetails.waitLoading();

        // Step 3: Click on "Actions" button > select "Pay" action
        FeeFinesDetails.openActions();
        FeeFinesDetails.openPayModal();
        PayFeeFine.waitLoading();

        // Step 4: Select any payment method, fill in "Payment amount*" field with any value and click on "Pay" button
        const paymentAmount = 25;
        PayFeeFine.setAmount(paymentAmount);
        PayFeeFine.setPaymentMethod(paymentMethod);

        // Step 5: Click on "Confirm" button and verify
        PayFeeFine.submitAndConfirm();
        PayFeeFine.checkConfirmModalClosed();
        FeeFinesDetails.checkFeeFineRemainingAmount('$25.00');
        FeeFinesDetails.checkFeeFineLatestPaymentStatus('Paid partially');
      },
    );
  });
});
