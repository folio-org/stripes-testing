import moment from 'moment';
import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import SettingsMenu from '../../support/fragments/settingsMenu';
import TopMenu from '../../support/fragments/topMenu';
import FeeFinesDetails from '../../support/fragments/users/feeFineDetails';
import UserFeeFines from '../../support/fragments/users/feeFines';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PayFeeFine from '../../support/fragments/users/payFeeFine';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

describe('Permissions', () => {
  describe('Permissions', () => {
    describe('Fees and Fines', () => {
      const userData = {};
      const feeFineType = {};
      const paymentMethod = {};
      let feeFineAccount;
      const ownerData = {};
      const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();

      before('Users, owners, fee fines are created', () => {
        cy.loginAsAdmin({
          path: SettingsMenu.circulationOtherSettingsPath,
          waiter: OtherSettings.waitLoading,
        }).then(() => {
          OtherSettings.selectPatronIdsForCheckoutScanning(['Barcode'], '1');
        });
        ServicePoints.createViaApi(servicePoint);

        UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner())
          .then(({ id, owner }) => {
            ownerData.name = owner;
            ownerData.id = id;
          })
          .then(() => {
            UsersOwners.addServicePointsViaApi(ownerData, [servicePoint]);
            ManualCharges.createViaApi({
              ...ManualCharges.defaultFeeFineType,
              ownerId: ownerData.id,
            }).then((manualCharge) => {
              feeFineType.id = manualCharge.id;
              feeFineType.name = manualCharge.feeFineType;
              feeFineType.amount = manualCharge.amount;
            });
            PaymentMethods.createViaApi(ownerData.id).then(({ name, id }) => {
              paymentMethod.name = name;
              paymentMethod.id = id;
            });
          });

        cy.createTempUser([
          permissions.checkoutCirculatingItems.gui,
          permissions.checkoutViewFeeFines.gui,
          permissions.uiUsersfeefinesView.gui,
        ])
          .then((userProperties) => {
            userData.username = userProperties.username;
            userData.password = userProperties.password;
            userData.userId = userProperties.userId;
            userData.barcode = userProperties.barcode;
            userData.firstName = userProperties.firstName;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(servicePoint.id, userData.userId);
            cy.getAdminSourceRecord().then((adminSourceRecord) => {
              feeFineAccount = {
                id: uuid(),
                ownerId: ownerData.id,
                feeFineId: feeFineType.id,
                amount: 9,
                userId: userData.userId,
                feeFineType: feeFineType.name,
                feeFineOwner: ownerData.name,
                createdAt: servicePoint.id,
                dateAction: moment.utc().format(),
                source: adminSourceRecord,
              };
              NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
                feeFineAccount.id = feeFineAccountId;
              });
            });
          });
      });

      after('UserOwner is removed', () => {
        cy.loginAsAdmin({ path: TopMenu.checkOutPath, waiter: Checkout.waitLoading });
        // without this waiter, the user will not be found by username
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(5000);
        CheckOutActions.checkOutUser(userData.barcode);
        CheckOutActions.openFeeFineLink('9.00', userData.userId);
        UserFeeFines.openFeeFine();
        FeeFinesDetails.openActions();
        FeeFinesDetails.openPayModal();
        PayFeeFine.checkAmount(9);
        PayFeeFine.setAmount(9);
        PayFeeFine.setPaymentMethod(paymentMethod);
        PayFeeFine.checkRestOfPay(0);
        PayFeeFine.submitAndConfirm();
        ManualCharges.deleteViaApi(feeFineType.id);
        PaymentMethods.deleteViaApi(paymentMethod.id);
        NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
        UsersOwners.deleteViaApi(ownerData.id);
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C388524 Check that User can click the fine amount as a link with necessary permissions (vega)',
        { tags: ['extendedPath', 'vega', 'C388524'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.checkOutPath,
            waiter: Checkout.waitLoading,
          });
          // without this waiter, the user will not be found by username
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(5000);
          CheckOutActions.checkOutUser(userData.barcode);
          CheckOutActions.openFeeFineLink('9.00', userData.userId);
          UserFeeFines.checkResultsInTheRowByBarcode(
            [feeFineAccount.feeFineType],
            feeFineAccount.feeFineOwner,
          );
        },
      );
    });
  });
});
