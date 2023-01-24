import uuid from 'uuid';
import TestTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import permissions from '../../support/dictionary/permissions';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import SettingsMenu from '../../support/fragments/settingsMenu';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import Users from '../../support/fragments/users/users';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import NoticePolicyApi from '../../support/fragments/circulation/notice-policy';
import NoticePolicyTemplateApi from '../../support/fragments/circulation/notice-policy-template';
import NewNoticePolicyTemplate from '../../support/fragments/circulation/newNoticePolicyTemplate';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../support/utils/stringTools';
import OverdueFinePolicy from '../../support/fragments/circulation/overdue-fine-policy';
import UsersOwners from '../../support/fragments/settings/users/usersOwners';
import PaymentMethods from '../../support/fragments/settings/users/paymentMethods';
import LoanPolicy from '../../support/fragments/circulation/loan-policy';
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

describe('Manual fee/fine', () => {
  const patronGroup = {
    name: 'groupToTestNotices' + getRandomPostfix(),
  };
  const userData = {
    personal: {
      lastname: null,
    },
  };
  const itemData = {
    barcode: generateItemBarcode(),
    title: `Instance ${getRandomPostfix()}`,
  };
  const testData = {
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation('autotestReceiveNotice', uuid()),
    ruleProps: {},
  };
  const createNoticeTemplate = (noticeName, noticeCategory) => {
    return {
      name: `Autotest_${getRandomPostfix()}_${noticeName}`,
      description: 'Created by autotest team',
      category: noticeCategory,
      subject: `Autotest_${getRandomPostfix()}_${noticeName}`,
      body: 'Test email body {{item.title}} {{loan.dueDateTime}}',
    };
  };
  const noticeTemplates = {
    manualFeeFineCharge: createNoticeTemplate('Overdue_fine_returned_upon_at', 'Manual fee/fine charge'),
    manualFeeFineAction: createNoticeTemplate(
      'Overdue_fine_returned_after_once',
      'Manual fee/fine action (pay, waive, refund, transfer or cancel/error)'
    ),
  };
  const searchResultsData = (templateName) => {
    return {
      userBarcode: userData.barcode,
      itemBarcode: itemData.barcode,
      object: 'Notice',
      circAction: 'Send',
      // TODO: add check for date with format <C6/8/2022, 6:46 AM>
      servicePoint: testData.userServicePoint.name,
      source: 'System',
      desc: `Template: ${templateName}. Triggering event: Overdue fine returned.`,
    };
  };
  const openFeeFines = () => {
    cy.visit(TopMenu.usersPath);
    UsersSearchPane.waitLoading();
    UsersSearchPane.searchByKeywords('user1');
    UsersCard.waitLoading();
    UsersCard.openFeeFines();
    UsersCard.showOpenedFeeFines();
    UserAllFeesFines.goToOpenFeeFines();
    UserAllFeesFines.clickRowCheckbox(0);
    FeeFineDetails.openActions();
  };
  const checkNoticeIsSent = (checkParams) => {
    SearchPane.searchByUserBarcode('user1');
    // SearchPane.searchByUserBarcode(userData.barcode);
    SearchPane.checkResultSearch(checkParams);
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
    template.category = 'AutomatedFeeFineCharge';
    NewNoticePolicyTemplate.checkAfterSaving(template);
  };
  const loanPolicyBody = {
    id: uuid(),
    name: `1_minute_${getRandomPostfix()}`,
    loanable: true,
    loansPolicy: {
      closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
      period: {
        duration: 1,
        intervalId: 'Minutes',
      },
      profileId: 'Rolling',
    },
    renewable: false,
  };
  const overdueFinePolicyBody = {
    id: uuid(),
    name: `automationOverdueFinePolicy${getRandomPostfix()}`,
    overdueFine: { quantity: '1.00', intervalId: 'minute' },
    countClosed: true,
    maxOverdueFine: '100.00',
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

  before('Preconditions', () => {
    cy.getAdminToken()
      .then(() => {
        ServicePoints.createViaApi(testData.userServicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.userServicePoint.id);
        Location.createViaApi(testData.defaultLocation);
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.createLoanType({
          name: `type_${getRandomPostfix()}`,
        }).then((loanType) => {
          testData.loanTypeId = loanType.id;
        });
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          testData.materialTypeId = materialTypes.id;
        });
      })
      .then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: itemData.title,
          },
          holdings: [
            {
              holdingsTypeId: testData.holdingTypeId,
              permanentLocationId: testData.defaultLocation.id,
            },
          ],
          items: [
            {
              barcode: itemData.barcode,
              status: { name: 'Available' },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ],
        }).then((specialInstanceIds) => {
          itemData.instanceId = specialInstanceIds.instanceId;
          itemData.holdingId = specialInstanceIds.holdingIds[0].id;
          itemData.itemId = specialInstanceIds.holdingIds[0].itemIds;
        });
      });

    LoanPolicy.createViaApi(loanPolicyBody);
    OverdueFinePolicy.createApi(overdueFinePolicyBody);
    UsersOwners.createViaApi(userOwnerBody);
    PaymentMethods.createViaApi(userOwnerBody.id).then((paymentMethodRes) => {
      testData.paymentMethod = paymentMethodRes;
    });

    PatronGroups.createViaApi(patronGroup.name).then((res) => {
      patronGroup.id = res;
      cy.createTempUser(
        [
          permissions.checkinAll.gui,
          permissions.checkoutAll.gui,
          permissions.circulationLogAll.gui,
          permissions.uiCirculationSettingsNoticeTemplates.gui,
          permissions.uiCirculationSettingsNoticePolicies.gui,
          permissions.loansAll.gui,

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
          userData.personal.lastname = userProperties.lastName;
        })
        .then(() => {
          UserEdit.addServicePointViaApi(
            testData.userServicePoint.id,
            userData.userId,
            testData.userServicePoint.id
          );

          cy.getCirculationRules().then((response) => {
            testData.baseRules = response.rulesAsText;
            testData.ruleProps = CirculationRules.getRuleProps(response.rulesAsText);
          });

          cy.login(userData.username, userData.password, {
            path: SettingsMenu.circulationPatronNoticeTemplatesPath,
            waiter: NewNoticePolicyTemplate.waitLoading,
          });
        });
    });
  });

  after('Deleting created entities', () => {
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    CirculationRules.deleteRuleViaApi(testData.baseRules);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    cy.deleteLoanPolicy(loanPolicyBody.id);
    NoticePolicyApi.deleteApi(testData.ruleProps.n);
    OverdueFinePolicy.deleteApi(overdueFinePolicyBody.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.deleteItem(itemData.itemId);
    cy.deleteHoldingRecordViaApi(itemData.holdingId);
    InventoryInstance.deleteInstanceViaApi(itemData.instanceId);
    PaymentMethods.deleteViaApi(testData.paymentMethod.id);
    UsersOwners.deleteViaApi(userOwnerBody.id);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id
    );
    NoticePolicyTemplateApi.getViaApi({ query: `name=${noticeTemplates.returnedUponAt.name}` }).then(
      (templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      }
    );
    NoticePolicyTemplateApi.getViaApi({ query: `name=${noticeTemplates.returnedAfterOnce.name}` }).then(
      (templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      }
    );
    NoticePolicyTemplateApi.getViaApi({ query: `name=${noticeTemplates.returnedAfterRecurring.name}` }).then(
      (templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      }
    );
  });

  it(
    'C347877 Manual fee/fine notices by fee/fine type: charge and action (vega)',
    { tags: [TestTypes.criticalPath, devTeams.vega] },
    () => {
      createPatronNoticeTemplate(noticeTemplates.manualFeeFineCharge);
      createPatronNoticeTemplate(noticeTemplates.manualFeeFineAction);

      cy.visit(SettingsMenu.manualCharges);
      const manualChargeData = {
        feeFineOwnerName: 'owner',
        feeFineType: 'test manual charge',
        defaultAmount: '10.00',
        chargeNoticeId: 'Manual fee/fine charge',
        actionNoticeId: 'Manual fee/fine action',
      };
      ManualCharges.createViaUi(manualChargeData);
      ManualCharges.checkManualCharge(manualChargeData);

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords('user1');
      UsersCard.waitLoading();
      UsersCard.openFeeFines();
      UsersCard.startFeeFineAdding();
      NewFeeFine.setFeeFineOwner('owner');
      NewFeeFine.checkFilteredFeeFineType('test manual charge');
      NewFeeFine.setFeeFineType('test manual charge');
      cy.intercept('POST', '/accounts').as('feeFineCreate');
      NewFeeFine.chargeOnly();
      cy.wait('@feeFineCreate').then((intercept) => {
        cy.visit(AppPaths.getFeeFineDetailsPath('e725b572-c4ab-4168-ba00-0adeb1174c0c', intercept.response.body.id));
      });
      cy.visit(TopMenu.circulationLogPath);
      checkNoticeIsSent(searchResultsData(noticeTemplates.returnedAfterRecurring.name));

      openFeeFines();
      UserAllFeesFines.clickTransfer();
      TransferFeeFine.setAmount(2);
      TransferFeeFine.setOwner('autotest_463.30873378344404971');
      TransferFeeFine.setTransferAccount('Traunt');
      TransferFeeFine.transferAndConfirm();

      openFeeFines();
      UserAllFeesFines.clickWaive();
      WaiveFeeFinesModal.waitLoading();
      WaiveFeeFinesModal.setWaiveAmount('2.00');
      WaiveFeeFinesModal.selectWaiveReason('simpleReason');
      WaiveFeeFinesModal.confirm();

      openFeeFines();
      UserAllFeesFines.clickPay();
      PayFeeFaine.setAmount('2.00');
      PayFeeFaine.setPaymentMethod({ name: 'card' });
      PayFeeFaine.submitAndConfirm();

      openFeeFines();
      UserAllFeesFines.clickRefund();
      RefundFeeFine.setAmount('2.00');
      RefundFeeFine.selectRefundReason('simpleRefund');
      RefundFeeFine.submitAndConfirm();
    }
  );
});
