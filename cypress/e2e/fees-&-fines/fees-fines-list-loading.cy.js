import moment from 'moment/moment';
import uuid from 'uuid';

import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import { Permissions } from '../../support/dictionary';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PayFeeFine from '../../support/fragments/users/payFeeFine';
import UsersCard from '../../support/fragments/users/usersCard';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Fees&Fines', () => {
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    ownerData: {},
  };
  const feeFineType = {};
  const paymentMethod = {};
  let feeFineAccounts;

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
    cy.createTempUser([
      Permissions.uiFeeFines.gui,
      Permissions.uiUsersManualPay.gui,
      Permissions.uiUsersfeefinesView.gui,
      Permissions.uiUsersSettingsAllFeeFinesRelated.gui,
    ])
      .then((userProperties) => {
        testData.user = userProperties;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(testData.servicePoint.id, testData.user.userId);
        cy.getAdminSourceRecord().then((adminSourceRecord) => {
          feeFineAccounts = [
            {
              id: uuid(),
              ownerId: testData.ownerData.id,
              feeFineId: feeFineType.id,
              amount: 20,
              userId: testData.user.userId,
              feeFineType: feeFineType.name,
              feeFineOwner: testData.ownerData.name,
              createdAt: testData.servicePoint.id,
              dateAction: moment.utc().format(),
              source: adminSourceRecord,
            },
            {
              id: uuid(),
              ownerId: testData.ownerData.id,
              feeFineId: feeFineType.id,
              amount: 20,
              userId: testData.user.userId,
              feeFineType: feeFineType.name,
              feeFineOwner: testData.ownerData.name,
              createdAt: testData.servicePoint.id,
              dateAction: moment.utc().format(),
              source: adminSourceRecord,
            },
          ];
          feeFineAccounts.forEach((feeFineAccount) => NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
            feeFineAccount.id = feeFineAccountId;
          }));
        });
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
        UsersSearchPane.searchByKeywords(testData.user.username);
        UsersSearchPane.openUser(testData.user.username);
        UsersCard.openFeeFines();
        UsersCard.showOpenedFeeFines();
        UserAllFeesFines.clickRowCheckbox(0);
        UserAllFeesFines.paySelectedFeeFines();
        PayFeeFine.setPaymentMethod(paymentMethod);
        PayFeeFine.submitAndConfirm();
        UserAllFeesFines.closeFeesFinesDetails();
      });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    ManualCharges.deleteViaApi(feeFineType.id);
    PaymentMethods.deleteViaApi(paymentMethod.id);
    feeFineAccounts.forEach((feeFineAccount) => NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id));
    UsersOwners.deleteViaApi(testData.ownerData.id);
    UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C368476 Check that Fees/fines list loading if user have any Fees/fines (vega) (TaaS)',
    { tags: ['extendedPath', 'vega', 'C368476'] },
    () => {
      // Click on "Fees/fines" accordion
      UsersCard.openFeeFines(1, 1);
      UsersCard.showOpenedFeeFines();
      // Click on "1 open fee/fine" link
      UserAllFeesFines.verifyFeeFineCount(1);
      // Click on "Closed" tab
      UserAllFeesFines.goToClosedFeesFines();
      UserAllFeesFines.verifyFeeFineCount(1);
      // Click on "All" tab
      UserAllFeesFines.goToAllFeeFines();
      UserAllFeesFines.verifyFeeFineCount(2);
    },
  );
});
