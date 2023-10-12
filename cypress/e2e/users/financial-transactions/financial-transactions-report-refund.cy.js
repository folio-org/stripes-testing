import uuid from 'uuid';
import moment from 'moment';
import Permissions from '../../../support/dictionary/permissions';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import UsersSearchResultsPane from '../../../support/fragments/users/usersSearchResultsPane';
import FinancialTransactionDetailReportModal from '../../../support/fragments/users/financialTransactionDetailReportModal';
import TestTypes from '../../../support/dictionary/testTypes';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import ManualCharges from '../../../support/fragments/settings/users/manualCharges';
import WaiveReasons from '../../../support/fragments/settings/users/waiveReasons';
import PaymentMethods from '../../../support/fragments/settings/users/paymentMethods';
import RefundReasons from '../../../support/fragments/settings/users/refundReasons';
import TransferAccounts from '../../../support/fragments/settings/users/transferAccounts';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Users from '../../../support/fragments/users/users';
import NewFeeFine from '../../../support/fragments/users/newFeeFine';
import PayFeeFane from '../../../support/fragments/users/payFeeFaine';
import RefundFeeFine from '../../../support/fragments/users/refundFeeFine';

describe('Financial Transactions Detail Report', () => {
  const reportName = 'Financial-Transactions-Detail-Report.csv';
  const userData = {};
  const ownerData = {};
  const feeFineType = {};
  const paymentMethod = {};
  const waiveReason = {};
  const refundReason = RefundReasons.getDefaultNewRefundReason(uuid());
  const transferAccount = TransferAccounts.getDefaultNewTransferAccount(uuid());
  const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
  let feeFineAccount;
  const actionAmount = 77;

  before(
    'Create owner, transfer account, feeFineType, paymentMethod, waiveReason, refundReason, user, feeFine',
    () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(servicePoint);

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
          WaiveReasons.createViaApi(WaiveReasons.getDefaultNewWaiveReason(uuid())).then((res) => {
            waiveReason.id = res.id;
          });

          RefundReasons.createViaApi(refundReason);

          cy.createTempUser([
            Permissions.uiUsersView.gui,
            Permissions.uiUsersfeefinesCRUD.gui,
            Permissions.uiUsersViewServicePoints.gui,
            Permissions.uiUsersfeefinesView.gui,
            Permissions.uiUsersManualCharge.gui,
            Permissions.uiUsersManualPay.gui,
            Permissions.uiUserAccounts.gui,
            Permissions.uiUserFinancialTransactionReport.gui,
          ])
            .then((userProperties) => {
              userData.username = userProperties.username;
              userData.password = userProperties.password;
              userData.userId = userProperties.userId;
              userData.barcode = userProperties.barcode;
              userData.firstName = userProperties.firstName;
            })
            .then(() => {
              UsersOwners.addServicePointsViaApi(ownerData, [servicePoint]);
              feeFineAccount = {
                id: uuid(),
                ownerId: ownerData.id,
                feeFineId: feeFineType.id,
                amount: 100,
                userId: userData.userId,
                feeFineType: feeFineType.name,
                feeFineOwner: ownerData.name,
                createdAt: servicePoint.id,
                dateAction: moment.utc().format(),
                source: 'ADMINISTRATOR, DIKU',
              };
              NewFeeFine.createViaApi(feeFineAccount).then((feeFineAccountId) => {
                feeFineAccount.id = feeFineAccountId;
                const payBody = {
                  amount: actionAmount,
                  paymentMethod: paymentMethod.name,
                  notifyPatron: false,
                  servicePointId: servicePoint.id,
                  userName: 'ADMINISTRATOR, DIKU',
                };
                const refundBody = {
                  amount: actionAmount,
                  paymentMethod: refundReason.nameReason,
                  notifyPatron: false,
                  servicePointId: servicePoint.id,
                  userName: 'ADMINISTRATOR, DIKU',
                };
                PayFeeFane.payFeeFineViaApi(payBody, feeFineAccountId);
                RefundFeeFine.refundFeeFineViaApi(refundBody, feeFineAccountId);

                cy.login(userData.username, userData.password);
                cy.visit(TopMenu.usersPath);
                UsersSearchResultsPane.waitLoading();
              });
            });
        });
    },
  );

  after(
    'Delete owner, transfer account, feeFineType, paymentMethod, waiveReason, refundReason, user',
    () => {
      TransferAccounts.deleteViaApi(transferAccount.id);
      ManualCharges.deleteViaApi(feeFineType.id);
      WaiveReasons.deleteViaApi(waiveReason.id);
      RefundReasons.deleteViaApi(refundReason.id);
      PaymentMethods.deleteViaApi(paymentMethod.id);
      NewFeeFine.deleteFeeFineAccountViaApi(feeFineAccount.id);
      UsersOwners.deleteViaApi(ownerData.id);
      Users.deleteViaApi(userData.userId);
      FinancialTransactionDetailReportModal.deleteDownloadedFile(reportName);
    },
  );

  it(
    'C343329 Check that the user can create "Financial Transactions Detail Report" for refund (vega)',
    { tags: [TestTypes.criticalPath, DevTeams.vega] },
    () => {
      UsersSearchResultsPane.openFinancialTransactionDetailReportModal();
      FinancialTransactionDetailReportModal.fillInRequiredFields({
        startDate: false,
        ownerName: ownerData.name,
      });
      FinancialTransactionDetailReportModal.fillInServicePoints([servicePoint.name]);

      FinancialTransactionDetailReportModal.save();
      FinancialTransactionDetailReportModal.verifyCalloutMessage();
      FinancialTransactionDetailReportModal.checkDownloadedFile(
        reportName,
        'Payment',
        actionAmount,
        15,
        paymentMethod.name,
        1,
      );
      FinancialTransactionDetailReportModal.checkDownloadedFile(
        reportName,
        'Refund',
        actionAmount,
        18,
        refundReason.nameReason,
        2,
      );
    },
  );
});
