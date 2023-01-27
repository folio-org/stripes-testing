import uuid from 'uuid';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import SettingsMenu from '../../support/fragments/settingsMenu';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Users from '../../support/fragments/users/users';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import NoticePolicyTemplateApi from '../../support/fragments/circulation/notice-policy-template';
import NewNoticePolicyTemplate from '../../support/fragments/circulation/newNoticePolicyTemplate';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import getRandomPostfix from '../../support/utils/stringTools';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import UserAllFeesFines from '../../support/fragments/users/userAllFeesFines';
import PayFeeFaine from '../../support/fragments/users/payFeeFaine';
import ManualCharges from '../../support/fragments/settings/users/manualCharges';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import AppPaths from '../../support/fragments/app-paths';
import FeeFineDetails from '../../support/fragments/users/feeFineDetails';
import TransferFeeFine from '../../support/fragments/users/transferFeeFine';
import WaiveFeeFinesModal from '../../support/fragments/users/waiveFeeFineModal';
import RefundFeeFine from '../../support/fragments/users/refundFeeFine';
import RefundReasons from '../../support/fragments/settings/users/refundReasons';
import TransferAccounts from '../../support/fragments/settings/users/transferAccounts';
import WaiveReasons from '../../support/fragments/settings/users/waiveReasons';

describe('Overdue fine', () => {
  const patronGroup = {
    name: 'groupToTestNotices' + getRandomPostfix(),
  };
  const userData = {};
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation('autotestReceiveNotice', uuid()),
  };
  const createNoticeTemplate = (noticeName, noticeCategory) => {
    return {
      name: `${noticeName}_${getRandomPostfix()}`,
      description: 'Created by autotest team',
      category: noticeCategory,
      subject: `${noticeName}_${getRandomPostfix()}`,
      body: '{{item.title}}',
    };
  };
  const noticeTemplates = {
    manualFeeFineCharge: createNoticeTemplate('Manual_fee_fine_charge', 'Manual fee/fine charge'),
    manualFeeFineAction: createNoticeTemplate(
      'Manual_fee_fine_action',
      'Manual fee/fine action (pay, waive, refund, transfer or cancel/error)'
    ),
  };
  const openFeeFines = () => {
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.waitLoading();
    UsersSearchPane.searchByKeywords(userData.barcode);
    UsersCard.waitLoading();
    UsersCard.openFeeFines();
    UsersCard.showOpenedFeeFines();
    UserAllFeesFines.goToOpenFeeFines();
    UserAllFeesFines.clickRowCheckbox(0);
    FeeFineDetails.openActions();
  };
  const checkNoticeIsSent = (noticesToCheck) => {
    cy.visit(TopMenu.circulationLogPath);
    SearchPane.searchByUserBarcode(userData.barcode);
    noticesToCheck.forEach((notice) => {
      SearchPane.findResultRowIndexByContent(notice.desc).then((rowIndex) => {
        SearchPane.checkResultSearch(notice, rowIndex);
      });
    });
  };
  const createPatronNoticeTemplate = (template) => {
    NewNoticePolicyTemplate.startAdding();
    NewNoticePolicyTemplate.checkInitialState();
    NewNoticePolicyTemplate.addToken('item.title');
    NewNoticePolicyTemplate.create(template, false);
    NewNoticePolicyTemplate.chooseCategory(template.category);
    NewNoticePolicyTemplate.checkPreview();
    NewNoticePolicyTemplate.saveAndClose();
    NewNoticePolicyTemplate.waitLoading();
  };
  const userOwnerBody = {
    id: uuid(),
    owner: 'AutotestOwner' + getRandomPostfix(),
    servicePointOwner: [
      {
        value: testData.userServicePoint.id,
        label: testData.userServicePoint.name,
      },
    ],
  };
  const transferAccount = TransferAccounts.getDefaultNewTransferAccount(uuid());
  const refundReason = RefundReasons.getDefaultNewRefundReason(uuid());
  const waiveReason = WaiveReasons.getDefaultNewWaiveReason(uuid());
  const manualCharge = {
    feeFineOwnerName: userOwnerBody.owner,
    feeFineType: 'Charge' + getRandomPostfix(),
    defaultAmount: '10.00',
    chargeNoticeId: noticeTemplates.manualFeeFineCharge.name,
    actionNoticeId: noticeTemplates.manualFeeFineAction.name,
  };

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.userServicePoint);
    });

    UsersOwners.createViaApi(userOwnerBody);
    PaymentMethods.createViaApi(userOwnerBody.id).then((paymentRes) => {
      testData.paymentMethodId = paymentRes.id;
      testData.paymentMethodName = paymentRes.name;
    });
    TransferAccounts.createViaApi({ ...transferAccount, ownerId: userOwnerBody.id });
    WaiveReasons.createViaApi(waiveReason);
    RefundReasons.createViaApi(refundReason);

    PatronGroups.createViaApi(patronGroup.name).then((group) => {
      patronGroup.id = group;
      cy.createTempUser(
        [
          permissions.uiUsersSettingsAllFeeFinesRelated.gui,
          permissions.circulationLogAll.gui,
          permissions.uiCirculationSettingsNoticeTemplates.gui,
          permissions.uiUsersfeefinesCRUD.gui,
          permissions.uiUserAccounts.gui,
        ],
        patronGroup.name
      )
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
          userData.barcode = userProperties.barcode;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            userData.userId,
            testData.userServicePoint.id
          );

          cy.login(userData.username, userData.password, {
            path: SettingsMenu.circulationPatronNoticeTemplatesPath,
            waiter: NewNoticePolicyTemplate.waitLoading,
          });
        });
    });
  });

  after('Deleting created entities', () => {
    cy.visit(TopMenu.usersPath);
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);

    TransferAccounts.deleteViaApi(transferAccount.id);
    WaiveReasons.deleteViaApi(waiveReason.id);
    RefundReasons.deleteViaApi(refundReason.id);
    cy.get('@manualChargeId').then((manualChargeId) => {
      ManualCharges.deleteViaApi(manualChargeId);
    });
    PaymentMethods.deleteViaApi(testData.paymentMethodId);
    UsersOwners.deleteViaApi(userOwnerBody.id);

    NoticePolicyTemplateApi.getViaApi({ query: `name=${noticeTemplates.manualFeeFineCharge.name}` }).then(
      (templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      }
    );
    NoticePolicyTemplateApi.getViaApi({ query: `name=${noticeTemplates.manualFeeFineAction.name}` }).then(
      (templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      }
    );
  });

  it(
    'C347874 Overdue fine, returned triggers (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega] },
    () => {
      createPatronNoticeTemplate(noticeTemplates.manualFeeFineCharge);
      noticeTemplates.manualFeeFineCharge.category = 'FeeFineCharge';
      NewNoticePolicyTemplate.checkAfterSaving(noticeTemplates.manualFeeFineCharge);
      createPatronNoticeTemplate(noticeTemplates.manualFeeFineAction);
      noticeTemplates.manualFeeFineAction.category = 'FeeFineAction';
      NewNoticePolicyTemplate.checkAfterSaving(noticeTemplates.manualFeeFineAction);

      cy.visit(SettingsMenu.manualCharges);
      ManualCharges.waitLoading();
      cy.intercept('POST', '/feefines').as('manualChargeCreate');
      ManualCharges.createViaUi(manualCharge);
      cy.wait('@manualChargeCreate').then((intercept) => {
        cy.wrap(intercept.response.body.id).as('manualChargeId');
      });
      ManualCharges.checkManualCharge(manualCharge);

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.barcode);
      UsersCard.waitLoading();
      UsersCard.openFeeFines();
      UsersCard.startFeeFineAdding();
      NewFeeFine.setFeeFineOwner(userOwnerBody.owner);
      NewFeeFine.checkFilteredFeeFineType(manualCharge.feeFineType);
      NewFeeFine.setFeeFineType(manualCharge.feeFineType);
      cy.intercept('POST', '/accounts').as('feeFineCreate');
      NewFeeFine.chargeOnly();
      cy.wait('@feeFineCreate').then((intercept) => {
        cy.wrap(intercept.response.body.id).as('feeFineId');
      });
      UsersSearchPane.waitLoading();
      checkNoticeIsSent([
        {
          userBarcode: userData.barcode,
          object: 'Notice',
          circAction: 'Send',
          desc: `Template: ${noticeTemplates.manualFeeFineCharge.name}. Triggering event: ${manualCharge.feeFineType}.`,
        },
        {
          userBarcode: userData.barcode,
          object: 'Fee/fine',
          circAction: 'Billed',
          desc: `Fee/Fine type: ${manualCharge.feeFineType}. Fee/Fine owner: ${userOwnerBody.owner}. Amount: 10.00. manual`,
        },
      ]);

      openFeeFines();
      UserAllFeesFines.clickTransfer();
      TransferFeeFine.setAmount(2);
      TransferFeeFine.setOwner(userOwnerBody.owner);
      TransferFeeFine.setTransferAccount(transferAccount.accountName);
      TransferFeeFine.transferAndConfirm();
      checkNoticeIsSent({
        userBarcode: userData.barcode,
        object: 'Fee/fine',
        circAction: 'Transferred partially',
        desc: `Fee/Fine type: ${manualCharge.feeFineType}. Amount: 2.00. Balance: 8.00. Transfer account: ${transferAccount.accountName}.`,
      });

      openFeeFines();
      UserAllFeesFines.clickWaive();
      WaiveFeeFinesModal.waitLoading();
      WaiveFeeFinesModal.setWaiveAmount('2.00');
      WaiveFeeFinesModal.selectWaiveReason(waiveReason.nameReason);
      WaiveFeeFinesModal.confirm();
      checkNoticeIsSent({
        userBarcode: userData.barcode,
        object: 'Fee/fine',
        circAction: 'Waived partially',
        desc: `Fee/Fine type: ${manualCharge.feeFineType}. Amount: 2.00. Balance: 6.00. Waive reason: ${waiveReason.nameReason}.`,
      });

      openFeeFines();
      UserAllFeesFines.clickPay();
      PayFeeFaine.setAmount('2.00');
      PayFeeFaine.setPaymentMethod({ name: testData.paymentMethodName });
      PayFeeFaine.submitAndConfirm();
      checkNoticeIsSent({
        userBarcode: userData.barcode,
        object: 'Fee/fine',
        circAction: 'Paid partially',
        desc: `Fee/Fine type: ${manualCharge.feeFineType}. Amount: 2.00. Balance: 4.00. Payment method: ${testData.paymentMethodName}.`,
      });

      openFeeFines();
      UserAllFeesFines.clickRefund();
      RefundFeeFine.setAmount('2.00');
      RefundFeeFine.selectRefundReason(refundReason.nameReason);
      RefundFeeFine.submitAndConfirm();
      checkNoticeIsSent({
        userBarcode: userData.barcode,
        object: 'Fee/fine',
        circAction: 'Refunded fully',
        desc: `Fee/Fine type: ${manualCharge.feeFineType}. Amount: 2.00. Balance: 6.00. Refund reason: ${refundReason.nameReason}.`,
      });

      cy.get('@feeFineId').then((feeFineId) => {
        cy.visit(AppPaths.getFeeFineDetailsPath(userData.userId, feeFineId));
        FeeFineDetails.waitLoading();
        FeeFineDetails.openActions();
        FeeFineDetails.openErrorModal();
        FeeFineDetails.confirmFeeFineCancellation('AutoTestComment');
      });
    }
  );
});
