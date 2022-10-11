import uuid from 'uuid';
import moment from 'moment';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import TestTypes from '../../support/dictionary/testTypes';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import TransferAccounts from '../../support/fragments/settings/users/transferAccounts';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import WaiveReasons from '../../support/fragments/settings/users/waiveReasons';
import RefundReasons from '../../support/fragments/settings/users/refundReasons';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import AppPaths from '../../support/fragments/app-paths';
import FeeFinesDetails from '../../support/fragments/users/feeFineDetails';
import PayFeeFaine from '../../support/fragments/users/payFeeFaine';
import AddNewStaffInfo from '../../support/fragments/users/addNewStaffInfo';

// The test fails because of the bug: UIU-2664
describe('Fee/Fine history ', () => {
  const userData = {};
  const ownerData = {};
  const feeFineType = {};
  const paymentMethod = {};
  const waiveReason = {};
  const refundReasonId = uuid();
  const transferAccount = TransferAccounts.getDefaultNewTransferAccount(uuid());
  let feeFineAccount;
  let servicePointId;
  const newStaffInfoMessage = 'information to check';

  before('Create owner, transfer account, feeFineType, paymentMethod, waiveReason, refundReason, user, feeFine', () => {
    cy.getAdminToken();
    ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => { servicePointId = servicePoints[0].id; });

    UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner(uuid(), 'owner')).then(({ id, ownerName }) => {
      ownerData.name = ownerName;
      ownerData.id = id;
    })
      .then(() => {
        TransferAccounts.createViaApi({ ...transferAccount, ownerId: ownerData.id });
        ManualCharges.createViaApi({ ...ManualCharges.defaultFeeFineType, ownerId: ownerData.id }).then(manualCharge => {
          feeFineType.id = manualCharge.id;
          feeFineType.name = manualCharge.feeFineType;
          feeFineType.amount = manualCharge.amount;
        });
        PaymentMethods.createViaApi(ownerData.id).then(({ name, id }) => {
          paymentMethod.name = name;
          paymentMethod.id = id;
        });
        WaiveReasons.createViaApi(WaiveReasons.getDefaultNewWaiveReason(uuid())).then(res => {
          waiveReason.id = res.body.id;
        });

        RefundReasons.createViaApi(RefundReasons.getDefaultNewRefundReason(refundReasonId));

        cy.createTempUser([
          permissions.uiUsersView.gui,
          permissions.uiUsersfeefinesCRUD.gui,
          permissions.uiUsersViewServicePoints.gui,
          permissions.uiUsersfeefinesView.gui,
          permissions.uiUsersManualCharge.gui,
          permissions.uiUsersManualPay.gui,
          permissions.uiUserAccounts.gui
        ])
          .then(userProperties => {
            userData.username = userProperties.username;
            userData.password = userProperties.password;
            userData.userId = userProperties.userId;
            userData.barcode = userProperties.barcode;
            userData.firstName = userProperties.firstName;
          })
          .then(() => {
            UserEdit.addServicePointViaApi(servicePointId, userData.userId);
            feeFineAccount = {
              id: uuid(),
              ownerId: ownerData.id,
              feeFineId: feeFineType.id,
              amount: feeFineType.amount,
              userId: userData.userId,
              feeFineType: feeFineType.name,
              createdAt: servicePointId,
              dateAction: moment.utc().format(),
              feeFineOwner: ownerData.name,
              source: 'ADMINISTRATOR, DIKU'
            };
            NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
              feeFineAccount.id = feeFineAccountId;
              cy.login(userData.username, userData.password);
            });
          });
      });
  });


  after('Delete owner, transfer account, feeFineType, paymentMethod, waiveReason, refundReason, user', () => {
    TransferAccounts.deleteViaApi(transferAccount.id);
    ManualCharges.deleteViaApi(feeFineType.id);
    WaiveReasons.deleteViaApi(waiveReason.id);
    RefundReasons.deleteViaApi(refundReasonId);
    PaymentMethods.deleteViaApi(paymentMethod.id);
    NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
    UsersOwners.deleteViaApi(ownerData.id);
    Users.deleteViaApi(userData.userId);
  });

  it('C347919 Check that the user can add "Additional information" on the fee/fine history (vega)', { tags: [TestTypes.smoke, devTeams.vega] }, () => {
    // the bug for this flaky issue is created FAT-2442
    cy.visit(AppPaths.getFeeFineDetailsPath(userData.userId, feeFineAccount.id));
    FeeFinesDetails.waitLoading();
    FeeFinesDetails.openPayModal();
    PayFeeFaine.checkAmount(feeFineType.amount);
    PayFeeFaine.setAmount(feeFineType.amount - 1);
    PayFeeFaine.checkRestOfPay(1);
    PayFeeFaine.setPaymentMethod(paymentMethod);
    PayFeeFaine.submitAndConfirm();
    PayFeeFaine.checkConfirmModalClosed();
    FeeFinesDetails.waitLoading();
    FeeFinesDetails.openNewStaffInfo();
    AddNewStaffInfo.waitLoading();
    AddNewStaffInfo.fillIn(newStaffInfoMessage);
    AddNewStaffInfo.submit();
    AddNewStaffInfo.checkStaffInfoModalClosed();
    FeeFinesDetails.waitLoading();
    FeeFinesDetails.checkNewStaffInfo(newStaffInfoMessage);
    FeeFinesDetails.openPayModal();
    PayFeeFaine.checkAmount(1);
    PayFeeFaine.setPaymentMethod(paymentMethod);
    PayFeeFaine.setAmount(1);
    PayFeeFaine.checkRestOfPay(0);
    PayFeeFaine.submitAndConfirm();
  });
});
