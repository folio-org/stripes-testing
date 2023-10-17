import uuid from 'uuid';
import moment from 'moment/moment';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import UserEdit from '../../support/fragments/users/userEdit';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import PayFeeFine from '../../support/fragments/users/payFeeFaine';

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
    cy.createTempUser([
      Permissions.uiFeeFines.gui,
      Permissions.uiUsersManualPay.gui,
      Permissions.uiUsersfeefinesView.gui,
    ])
      .then((userProperties) => {
        userData = userProperties;
      })
      .then(() => {
        UserEdit.addServicePointViaApi(testData.servicePoint.id, userData.userId);
        feeFineAccount = {
          id: uuid(),
          ownerId: testData.ownerData.id,
          feeFineId: feeFineType.id,
          amount: 9,
          userId: userData.userId,
          feeFineType: feeFineType.name,
          feeFineOwner: testData.ownerData.name,
          createdAt: testData.servicePoint.id,
          dateAction: moment.utc().format(),
          source: 'ADMINISTRATOR, DIKU',
        };
        NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
          feeFineAccount.id = feeFineAccountId;
        });
        cy.login(userData.username, userData.password, {
          path: TopMenu.usersPath,
          waiter: UsersSearchPane.waitLoading,
        });
      });
  });

  after('Delete test data', () => {
    PayFeeFine.setPaymentMethod(paymentMethod);
    PayFeeFine.setAmount(feeFineAccount.amount);
    PayFeeFine.checkRestOfPay(0);
    PayFeeFine.submitAndConfirm();
    ManualCharges.deleteViaApi(feeFineType.id);
    PaymentMethods.deleteViaApi(paymentMethod.id);
    NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
    UsersOwners.deleteViaApi(testData.ownerData.id);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.servicePoint.id]);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(userData.userId);
  });

  it(
    'C456 Verify behavior when "Pay" button pressed from Fee/Fine History page with 1 fee/fine selected (vega) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.vega] },
    () => {
      // Go to User Information for your test patron
      UsersSearchPane.searchByKeywords(userData.username);
      UsersSearchPane.selectUserFromList(userData.username);
      UsersCard.waitLoading();
      // Before expanding the Fees/Fines section, you should see a number representing the total number of outstanding fees/fines on the closed accordion (see attachment closed-ff-section.JPG as an example)
      // reload is needed, because sometimes it shows 0 Fees/Fines
      cy.reload();
      UsersCard.verifyFeesFinesCount('1');
      // Expand the Fees/Fines section to see details about the fees/fines owned by the patron, verifying that the count and amount of open fees/fines is correct (see attachment open-ff-section.JPG as an example)
      UsersCard.openFeeFines();
      // Click on the View all fees/fines link to open Fees/Fines History (aka Open/Closed/All Fees/Fines)
      UsersCard.viewAllFeesFines();
      // Place a check mark in the checkbox to the left of the row in Fees/Fines History that represents the Manual fee/fine charge you created
      UserAllFeesFines.clickRowCheckbox(0);
      // Choose Pay in the Actions menu
      UserAllFeesFines.paySelectedFeeFines();
      // The Pay fee/fine modal will open (as shown in attachment pay-ff-modal.JPG), with the Payment amount set to the total amount of the fee/fine you selected in step 5
      PayFeeFine.checkAmount(feeFineAccount.amount);
    },
  );
});
