import uuid from 'uuid';
import moment from 'moment';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import DevTeams from '../../support/dictionary/devTeams';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../support/fragments/users/users';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import FeeFinesDetails from '../../support/fragments/users/feeFineDetails';
import PayFeeFaine from '../../support/fragments/users/payFeeFaine';
import UserEdit from '../../support/fragments/users/userEdit';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import SettingsMenu from '../../support/fragments/settingsMenu';
import UserFeeFines from '../../support/fragments/users/feeFines';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

describe('Fee fine amout link in checkout', () => {
  const userData = {};
  const feeFineType = {};
  const paymentMethod = {};
  let feeFineAccount;
  const ownerData = {};
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();

  before('Users, owners, fee fines are created', () => {
    // the login with admin, visiting the path and the waiter are separated to get the fetch request to get owners
    cy.getAdminToken().then(() => {
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

      cy.createTempUser([permissions.checkoutCirculatingItems.gui])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
          userData.barcode = userProperties.barcode;
          userData.firstName = userProperties.firstName;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(servicePoint.id, userData.userId);
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
            source: 'ADMINISTRATOR, DIKU',
          };
          NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
            feeFineAccount.id = feeFineAccountId;
          });
        });
    });
  });

  after('UserOwner is removed', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.checkOutPath);
    Checkout.waitLoading();
    // without this waiter, the user will not be found by username
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(4000);
    CheckOutActions.checkOutUser(userData.barcode);
    CheckOutActions.openFeeFineLink('9.00', userData.userId);
    UserFeeFines.openFeeFine();
    FeeFinesDetails.openActions().then(() => {
      FeeFinesDetails.openPayModal();
    });
    PayFeeFaine.checkAmount(9);
    PayFeeFaine.setPaymentMethod(paymentMethod);
    PayFeeFaine.setAmount(9);
    PayFeeFaine.checkRestOfPay(0);
    PayFeeFaine.submitAndConfirm();
    ManualCharges.deleteViaApi(feeFineType.id);
    PaymentMethods.deleteViaApi(paymentMethod.id);
    NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
    UsersOwners.deleteViaApi(ownerData.id);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C388525 Check that User can not click the fine amount as a link with necessary permissions (vega)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      cy.login(userData.username, userData.password);
      cy.visit(TopMenu.checkOutPath);
      Checkout.waitLoading();
      // without this waiter, the user will not be found by username
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(4000);
      CheckOutActions.checkOutUser(userData.barcode);
      CheckOutActions.feeFineLinkIsNotClickable('9.00', userData.userId);
    },
  );
});
