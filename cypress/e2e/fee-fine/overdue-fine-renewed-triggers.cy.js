import uuid from 'uuid';
import { DevTeams, TestTypes, Permissions } from '../../support/dictionary';
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
import NoticePolicyApi, {
  NOTICE_CATEGORIES,
} from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticePolicyTemplateApi from '../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import NewNoticePolicy from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import NewNoticePolicyTemplate, {
  createNoticeTemplate,
} from '../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import CheckOutActions from '../../support/fragments/check-out-actions/check-out-actions';
import Checkout from '../../support/fragments/checkout/checkout';
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
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import UserLoans from '../../support/fragments/users/loans/userLoans';
import LoanDetails from '../../support/fragments/users/userDefaultObjects/loanDetails';
import NewFeeFine from '../../support/fragments/users/newFeeFine';
import { ITEM_STATUS_NAMES } from '../../support/constants';

describe('Overdue fine', () => {
  let addedCirculationRule;
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
    userServicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    ruleProps: {},
  };
  const noticeTemplates = [
    createNoticeTemplate({
      name: 'Overdue_fine_renewed_upon_at',
      category: NOTICE_CATEGORIES.AutomatedFeeFineCharge,
      noticeOptions: {
        noticeName: 'FeeFine',
        noticeId: 'feeFine',
        send: 'Upon/At',
        action: 'Overdue fine, renewed',
      },
    }),
    createNoticeTemplate({
      name: 'Overdue_fine_renewed_after_once',
      category: NOTICE_CATEGORIES.AutomatedFeeFineCharge,
      noticeOptions: {
        noticeName: 'FeeFine',
        noticeId: 'feeFine',
        send: 'After',
        action: 'Overdue fine, renewed',
        sendBy: {
          duration: '1',
          interval: 'Minute(s)',
        },
        frequency: 'One Time',
      },
    }),
    createNoticeTemplate({
      name: `Autotest_${getRandomPostfix()}_Overdue_fine_renewed_after_recurring`,
      category: NOTICE_CATEGORIES.AutomatedFeeFineCharge,
      noticeOptions: {
        noticeName: 'FeeFine',
        noticeId: 'feeFine',
        send: 'After',
        action: 'Overdue fine, renewed',
        sendBy: {
          duration: '1',
          interval: 'Minute(s)',
        },
        frequency: 'Recurring',
        sendEvery: {
          duration: '1',
          interval: 'Minute(s)',
        },
      },
    }),
  ];
  const searchResultsData = (templateName) => {
    return {
      userBarcode: userData.barcode,
      itemBarcode: itemData.barcode,
      object: 'Notice',
      circAction: 'Send',
      // TODO: add check for date with format <C6/8/2022, 6:46 AM>
      servicePoint: testData.userServicePoint.name,
      source: 'System',
      desc: `Template: ${templateName}. Triggering event: Overdue fine renewed.`,
    };
  };
  const checkNoticeIsSent = (checkParams) => {
    SearchPane.searchByUserBarcode(userData.barcode);
    SearchPane.findResultRowIndexByContent(checkParams.desc).then((rowIndex) => {
      SearchPane.checkResultSearch(checkParams, rowIndex);
    });
  };
  const noticePolicy = {
    name: `Autotest ${getRandomPostfix()} Overdue fine, returned`,
    description: 'Created by autotest team',
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
    renewable: true,
    renewalsPolicy: {
      unlimited: true,
      renewFromId: 'CURRENT_DUE_DATE',
    },
  };
  const overdueFinePolicyBody = {
    id: uuid(),
    name: `automationOverdueFinePolicy${getRandomPostfix()}`,
    overdueFine: { quantity: '1.00', intervalId: 'minute' },
    countClosed: true,
    maxOverdueFine: '100.00',
    forgiveOverdueFine: false,
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
        cy.getMaterialTypes({ query: 'name="book"' }).then((materialType) => {
          testData.materialTypeId = materialType.id;
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
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
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

    OtherSettings.setOtherSettingsViaApi({ prefPatronIdentifier: 'barcode,username' });
    LoanPolicy.createViaApi(loanPolicyBody);
    OverdueFinePolicy.createViaApi(overdueFinePolicyBody);
    UsersOwners.createViaApi(userOwnerBody);
    PaymentMethods.createViaApi(userOwnerBody.id).then((paymentMethodRes) => {
      testData.paymentMethod = paymentMethodRes;
    });

    PatronGroups.createViaApi(patronGroup.name).then((res) => {
      patronGroup.id = res;
      cy.createTempUser(
        [
          Permissions.loansRenew.gui,
          Permissions.checkinAll.gui,
          Permissions.checkoutAll.gui,
          Permissions.circulationLogAll.gui,
          Permissions.uiCirculationSettingsNoticeTemplates.gui,
          Permissions.uiCirculationSettingsNoticePolicies.gui,
          Permissions.uiUsersfeefinesCRUD.gui,
          Permissions.uiUserAccounts.gui,
        ],
        patronGroup.name,
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
            testData.userServicePoint.id,
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
    CheckInActions.checkinItemViaApi({
      itemBarcode: itemData.barcode,
      servicePointId: testData.userServicePoint.id,
      checkInDate: new Date().toISOString(),
    });
    NewFeeFine.getUserFeesFines(userData.userId).then((userFeesFines) => {
      const feesFinesData = userFeesFines.accounts;
      feesFinesData.forEach(({ id }) => {
        cy.deleteFeesFinesApi(id);
      });
    });
    UserEdit.changeServicePointPreferenceViaApi(userData.userId, [testData.userServicePoint.id]);
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    ServicePoints.deleteViaApi(testData.userServicePoint.id);
    cy.deleteLoanPolicy(loanPolicyBody.id);
    NoticePolicyApi.deleteViaApi(testData.ruleProps.n);
    OverdueFinePolicy.deleteViaApi(overdueFinePolicyBody.id);
    Users.deleteViaApi(userData.userId);
    PatronGroups.deleteViaApi(patronGroup.id);
    cy.deleteItemViaApi(itemData.itemId);
    cy.deleteHoldingRecordViaApi(itemData.holdingId);
    InventoryInstance.deleteInstanceViaApi(itemData.instanceId);
    PaymentMethods.deleteViaApi(testData.paymentMethod.id);
    UsersOwners.deleteViaApi(userOwnerBody.id);
    Location.deleteViaApiIncludingInstitutionCampusLibrary(
      testData.defaultLocation.institutionId,
      testData.defaultLocation.campusId,
      testData.defaultLocation.libraryId,
      testData.defaultLocation.id,
    );
    noticeTemplates.forEach((template) => {
      NoticePolicyTemplateApi.getViaApi({
        query: `name=${template.name}`,
      }).then((templateId) => {
        NoticePolicyTemplateApi.deleteViaApi(templateId);
      });
    });
    cy.deleteLoanType(testData.loanTypeId);
  });

  it(
    'C347875 Overdue fine, renewed triggers (volaris)',
    { tags: [TestTypes.criticalPath, DevTeams.volaris] },
    () => {
      noticeTemplates.forEach((template, index) => {
        NewNoticePolicyTemplate.createPatronNoticeTemplate(template, !!index);
        NewNoticePolicyTemplate.checkAfterSaving(template);
      });

      cy.visit(SettingsMenu.circulationPatronNoticePoliciesPath);
      NewNoticePolicy.waitLoading();

      NewNoticePolicy.createPolicy({ noticePolicy, noticeTemplates });
      NewNoticePolicy.checkPolicyName(noticePolicy);

      cy.getNoticePolicy({ query: `name=="${noticePolicy.name}"` }).then((noticePolicyRes) => {
        testData.ruleProps.n = noticePolicyRes[0].id;
        testData.ruleProps.l = loanPolicyBody.id;
        testData.ruleProps.o = overdueFinePolicyBody.id;
        addedCirculationRule =
          't ' +
          testData.loanTypeId +
          ': i ' +
          testData.ruleProps.i +
          ' l ' +
          testData.ruleProps.l +
          ' r ' +
          testData.ruleProps.r +
          ' o ' +
          testData.ruleProps.o +
          ' n ' +
          testData.ruleProps.n;
        CirculationRules.addRuleViaApi(
          testData.baseRules,
          testData.ruleProps,
          't ',
          testData.loanTypeId,
        );
      });

      cy.visit(TopMenu.checkOutPath);
      CheckOutActions.checkOutUser(userData.barcode);
      CheckOutActions.checkUserInfo(userData, patronGroup.name);
      CheckOutActions.checkOutItem(itemData.barcode);
      Checkout.verifyResultsInTheRow([itemData.barcode]);
      CheckOutActions.endCheckOutSession();

      UserLoans.changeDueDateForAllOpenPatronLoans(userData.userId, -1);

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.barcode);
      UsersCard.waitLoading();
      UsersCard.viewCurrentLoans();
      UserLoans.openLoanDetails(itemData.barcode);
      UserLoans.renewItem(itemData.barcode, true);
      LoanDetails.checkAction(0, 'Renewed');

      cy.visit(TopMenu.circulationLogPath);
      // wait to get "Overdue fine returned after once" and "Overdue fine returned after recurring" notices
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(200000);
      cy.reload();

      noticeTemplates.forEach((template) => {
        checkNoticeIsSent(searchResultsData(template.name));
      });

      cy.visit(TopMenu.usersPath);
      UsersSearchPane.waitLoading();
      UsersSearchPane.searchByKeywords(userData.barcode);
      UsersCard.waitLoading();
      UsersCard.openFeeFines();
      UsersCard.showOpenedFeeFines();
      UserAllFeesFines.clickRowCheckbox(0);
      UserAllFeesFines.paySelectedFeeFines();
      PayFeeFaine.setPaymentMethod(testData.paymentMethod);
      PayFeeFaine.submitAndConfirm();

      cy.visit(TopMenu.circulationLogPath);
      // wait to check that we don't get new "Overdue fine returned after recurring" notice because fee/fine was paid
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(100000);
      SearchPane.searchByUserBarcode(userData.barcode);
      SearchPane.checkResultSearch({ object: 'Fee/fine', circAction: 'Paid fully' }, 0);
    },
  );
});
