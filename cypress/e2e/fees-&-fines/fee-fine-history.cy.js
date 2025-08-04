import moment from 'moment';
import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import RefundReasons from '../../support/fragments/settings/users/refundReasons';
import TransferAccounts from '../../support/fragments/settings/users/transferAccounts';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import WaiveReasons from '../../support/fragments/settings/users/waiveReasons';
import TopMenu from '../../support/fragments/topMenu';
import AddNewStaffInfo from '../../support/fragments/users/addNewStaffInfo';
import FeeFinesDetails from '../../support/fragments/users/feeFineDetails';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import PayFeeFine from '../../support/fragments/users/payFeeFine';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Fees&Fines', () => {
  describe(
    'Manual Fees/Fines',
    {
      retries: {
        runMode: 2,
      },
    },
    () => {
      const userData = {};
      const ownerData = {};
      const feeFineType = {};
      const paymentMethod = {};
      const waiveReason = {};
      let refundReasonId;
      let transferAccount;
      let feeFineAccount;
      let servicePointId;
      const newStaffInfoMessage = 'information to check';

      beforeEach(
        'Create owner, transfer account, feeFineType, paymentMethod, waiveReason, refundReason, user, feeFine',
        () => {
          refundReasonId = uuid();
          transferAccount = TransferAccounts.getDefaultNewTransferAccount(uuid());

          cy.getAdminToken();
          ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
            servicePointId = servicePoints[0].id;
          });

          UsersOwners.createViaApi(UsersOwners.getDefaultNewOwner())
            .then(({ id, owner }) => {
              ownerData.name = owner;
              ownerData.id = id;
            })
            .then(() => {
              TransferAccounts.createViaApi({ ...transferAccount, ownerId: ownerData.id });
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
              WaiveReasons.createViaApi(WaiveReasons.getDefaultNewWaiveReason(uuid())).then(
                (res) => {
                  waiveReason.id = res.id;
                },
              );

              RefundReasons.createViaApi(RefundReasons.getDefaultNewRefundReason(refundReasonId));

              cy.createTempUser([
                permissions.uiUsersView.gui,
                permissions.uiUsersfeefinesCRUD.gui,
                permissions.feesfinesCheckPay.gui,
                permissions.feesfinesPay.gui,
                permissions.uiUsersViewServicePoints.gui,
                permissions.uiUsersfeefinesView.gui,
                permissions.uiFeeFinesActions.gui,
                permissions.uiUsersManualCharge.gui,
                permissions.uiUsersManualPay.gui,
                permissions.uiUserAccounts.gui,
              ]).then((userProperties) => {
                userData.username = userProperties.username;
                userData.password = userProperties.password;
                userData.userId = userProperties.userId;
                userData.barcode = userProperties.barcode;
                userData.firstName = userProperties.firstName;
              });
              cy.getAdminSourceRecord().then((adminSourceRecord) => {
                UserEdit.addServicePointViaApi(servicePointId, userData.userId);
                feeFineAccount = {
                  id: uuid(),
                  ownerId: ownerData.id,
                  feeFineId: feeFineType.id,
                  // this test will be failed if the amount has two or more digits. Issue https://issues.folio.org/browse/UIU-2812
                  amount: 9,
                  userId: userData.userId,
                  feeFineType: feeFineType.name,
                  feeFineOwner: ownerData.name,
                  createdAt: servicePointId,
                  dateAction: moment.utc().format(),
                  source: adminSourceRecord,
                };
                NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
                  feeFineAccount.id = feeFineAccountId;
                });
              });
            });
        },
      );

      afterEach(
        'Delete owner, transfer account, feeFineType, paymentMethod, waiveReason, refundReason, user',
        () => {
          cy.getAdminToken();
          TransferAccounts.deleteViaApi(transferAccount.id);
          ManualCharges.deleteViaApi(feeFineType.id);
          WaiveReasons.deleteViaApi(waiveReason.id);
          RefundReasons.deleteViaApi(refundReasonId);
          PaymentMethods.deleteViaApi(paymentMethod.id);
          NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
          UsersOwners.deleteViaApi(ownerData.id);
          Users.deleteViaApi(userData.userId);
        },
      );

      it(
        'C347919 Check that the user can add "Additional information" on the fee/fine history (vega)',
        { tags: ['smoke', 'vega', 'system', 'shiftLeft', 'C347919'] },
        () => {
          // the bug for this flaky issue is created FAT-2442. As temporary fix for this bug we need a waiter to be sure that the fee-fine is created before opening its page.
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(10000);
          cy.login(userData.username, userData.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });

          UsersSearchPane.searchByKeywords(userData.username);
          UsersSearchPane.selectUserFromList(userData.username);
          UsersCard.waitLoading();
          UsersCard.openFeeFines();
          UsersCard.viewAllFeesFines();
          UserAllFeesFines.clickOnRowByIndex(0);

          FeeFinesDetails.openActions();
          FeeFinesDetails.openPayModal();
          PayFeeFine.checkAmount(feeFineAccount.amount);
          PayFeeFine.setAmount(feeFineAccount.amount - 2);
          PayFeeFine.setPaymentMethod(paymentMethod);
          PayFeeFine.checkRestOfPay(2);
          PayFeeFine.submitAndConfirm();
          PayFeeFine.checkConfirmModalClosed();
          FeeFinesDetails.waitLoading();
          FeeFinesDetails.openNewStaffInfo();
          AddNewStaffInfo.waitLoading();
          AddNewStaffInfo.fillIn(newStaffInfoMessage);
          AddNewStaffInfo.submit();
          AddNewStaffInfo.checkStaffInfoModalClosed();
          FeeFinesDetails.waitLoading();
          FeeFinesDetails.checkNewStaffInfo(newStaffInfoMessage);
          FeeFinesDetails.openActions();
          FeeFinesDetails.openPayModal();
          PayFeeFine.checkAmount(2);
          PayFeeFine.setAmount(2);
          PayFeeFine.setPaymentMethod(paymentMethod);
          PayFeeFine.checkRestOfPay(0);
          PayFeeFine.submitAndConfirm();
        },
      );
    },
  );
});
