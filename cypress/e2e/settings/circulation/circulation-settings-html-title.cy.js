import BaseCirculationPane, {
  CIRCULATION_SETTINGS,
} from '../../../support/fragments/settings/circulation/baseCirculationPane';
import FixedDueDateSchedules from '../../../support/fragments/circulation/fixedDueDateSchedules';
import LoanPolicy, { defaultLoanPolicy } from '../../../support/fragments/circulation/loan-policy';
import OverdueFinePolicy, {
  defaultOverdueFinePolicy,
} from '../../../support/fragments/circulation/overdue-fine-policy';
import LostItemFeePolicy, {
  defaultLostItemFeePolicy,
} from '../../../support/fragments/circulation/lost-item-fee-policy';
import NoticePolicies, {
  getDefaultNoticePolicy,
} from '../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import NoticeTemplates from '../../../support/fragments/settings/circulation/patron-notices/noticeTemplates';
import RequestPolicy, {
  defaultRequestPolicy,
} from '../../../support/fragments/circulation/request-policy';
import TopMenu from '../../../support/fragments/topMenu';
import { STAFF_SLIP_NAMES } from '../../../support/constants';
import StaffSlips from '../../../support/fragments/settings/circulation/staffSlips/staffSlips';
import StaffSlip from '../../../support/fragments/settings/circulation/staffSlips/staffSlip';
import OverdueFineUiPolicies from '../../../support/fragments/settings/circulation/fee-fine/overdueFinePolicies';
import NewNoticePolicy from '../../../support/fragments/settings/circulation/patron-notices/newNoticePolicy';
import NewNoticePolicyTemplate from '../../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';

const CIRC_TITLE_PREFIX = 'Circulation settings';
const FOLIO_SUFFIX = 'FOLIO';

describe('Settings: Circulation', () => {
  const testData = {};

  before('Create test data and login', () => {
    cy.getAdminToken();

    FixedDueDateSchedules.createViaApi().then((fdds) => {
      testData.fixedDueDateSchedule = fdds;
    });

    LoanPolicy.createViaApi(defaultLoanPolicy).then((policy) => {
      testData.loanPolicy = policy;
    });

    OverdueFinePolicy.createViaApi(defaultOverdueFinePolicy).then((policy) => {
      testData.overduePolicy = policy;
    });

    LostItemFeePolicy.createViaApi(defaultLostItemFeePolicy).then((policy) => {
      testData.lostPolicy = policy;
    });

    const noticePolicy = getDefaultNoticePolicy();
    NoticePolicies.createWithTemplateApi(noticePolicy).then(({ body }) => {
      testData.noticePolicy = body;
    });

    const noticeTemplate = NoticeTemplates.getDefaultTemplate();
    NoticeTemplates.createViaApi(noticeTemplate).then((template) => {
      testData.noticeTemplate = template;
    });

    RequestPolicy.createViaApi(defaultRequestPolicy).then((policy) => {
      testData.requestPolicy = policy;
    });

    cy.loginAsAdmin({
      path: TopMenu.settingsPath,
      waiter: () => BaseCirculationPane.waitLoading('Settings'),
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    FixedDueDateSchedules.deleteApi(testData.fixedDueDateSchedule.id);
    LoanPolicy.deleteApi(testData.loanPolicy.id);
    OverdueFinePolicy.deleteViaApi(testData.overduePolicy.id);
    LostItemFeePolicy.deleteViaApi(testData.lostPolicy.id);
    NoticePolicies.deleteViaApi(testData.noticePolicy.id);
    NoticeTemplates.deleteViaApi(testData.noticeTemplate.id);
    RequestPolicy.deleteViaApi(testData.requestPolicy.id);
  });

  it(
    'C436947 Checking titles on "Settings -> Circulation" page (vega)',
    { tags: ['extendedPath', 'vega', 'C436947'] },
    () => {
      // Step 1: Verify Settings page title
      BaseCirculationPane.verifyPageTitle(`Settings - ${FOLIO_SUFFIX}`);

      // Step 1: Click on "Circulation" and check title
      BaseCirculationPane.goToCirculationTab();
      BaseCirculationPane.verifyPageTitle(`${CIRC_TITLE_PREFIX} - ${FOLIO_SUFFIX}`);

      // Step 3: Click on "Circulation rules" and check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.CIRCULATION_RULES);
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.CIRCULATION_RULES} - ${FOLIO_SUFFIX}`,
      );

      // Step 4: Click on "Other settings" and check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.OTHER_SETTINGS);
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.OTHER_SETTINGS} - ${FOLIO_SUFFIX}`,
      );

      // Step 5: Click on "Staff slips" and check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.STAFF_SLIPS);
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.STAFF_SLIPS} - ${FOLIO_SUFFIX}`,
      );

      // Step 6: Click on "Fixed due date schedules" and check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.FIXED_DUE_DATE_SCHEDULES);
      FixedDueDateSchedules.waitLoading();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.FIXED_DUE_DATE_SCHEDULES} - ${FOLIO_SUFFIX}`,
      );

      // Step 7: Select any Fixed due date schedule and check title
      cy.contains(testData.fixedDueDateSchedule.name).click();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${testData.fixedDueDateSchedule.name} - ${FOLIO_SUFFIX}`,
      );

      // Step 8: Click on "Loan anonymization" and check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.LOAN_ANONYMIZATION);
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.LOAN_ANONYMIZATION} - ${FOLIO_SUFFIX}`,
      );

      // Step 9: Click on "Loan policies" and check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.LOAN_POLICIES);
      LoanPolicy.waitLoading();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.LOAN_POLICIES} - ${FOLIO_SUFFIX}`,
      );

      // Step 10: Select any Loan policy and check title
      cy.contains(defaultLoanPolicy.name).click();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${defaultLoanPolicy.name} - ${FOLIO_SUFFIX}`,
      );

      // Step 11: Click on "Overdue fine policies" and check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.OVERDUE_FINE_POLICIES);
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.OVERDUE_FINE_POLICIES} - ${FOLIO_SUFFIX}`,
      );

      // Step 12: Select any Overdue fine policy and check title
      cy.contains(defaultOverdueFinePolicy.name).click();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${defaultOverdueFinePolicy.name} - ${FOLIO_SUFFIX}`,
      );

      // Step 13: Click on "Lost item fee policies" and check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.LOST_ITEM_FEE_POLICIES);
      LostItemFeePolicy.waitLoading();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.LOST_ITEM_FEE_POLICIES} - ${FOLIO_SUFFIX}`,
      );

      // Step 14: Select any Lost item fee policy and check title
      cy.contains(defaultLostItemFeePolicy.name).click();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${defaultLostItemFeePolicy.name} - ${FOLIO_SUFFIX}`,
      );

      // Step 15: Click on "Patron notice policies" and check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.PATRON_NOTICE_POLICIES);
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.PATRON_NOTICE_POLICIES} - ${FOLIO_SUFFIX}`,
      );

      // Step 16: Select any Patron notice policy and check title
      cy.contains(testData.noticePolicy.name).click();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${testData.noticePolicy.name} - ${FOLIO_SUFFIX}`,
      );

      // Step 17: Click on "Patron notice templates" and check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.PATRON_NOTICE_TEMPLATES);
      NoticeTemplates.waitLoading();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.PATRON_NOTICE_TEMPLATES} - ${FOLIO_SUFFIX}`,
      );

      // Step 18: Select any Patron notice template and check title
      cy.contains(testData.noticeTemplate.name).click();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${testData.noticeTemplate.name} - ${FOLIO_SUFFIX}`,
      );

      // Step 19: Click on "Request cancellation reasons" and check title
      BaseCirculationPane.goToSettingsCirculation(
        CIRCULATION_SETTINGS.REQUEST_CANCELLATION_REASONS,
      );
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.REQUEST_CANCELLATION_REASONS} - ${FOLIO_SUFFIX}`,
      );

      // Step 20: Click on "Request policies" and check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.REQUEST_POLICIES);
      RequestPolicy.waitLoading();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.REQUEST_POLICIES} - ${FOLIO_SUFFIX}`,
      );

      // Step 21: Select any Request policy and check title
      cy.contains(defaultRequestPolicy.name).click();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${defaultRequestPolicy.name} - ${FOLIO_SUFFIX}`,
      );

      // Step 22: Click on "Title level requests" and check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.TITLE_LEVEL_REQUESTS);
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.TITLE_LEVEL_REQUESTS} - ${FOLIO_SUFFIX}`,
      );

      // Step 23: Click on "Print hold requests" and check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.PRINT_HOLD_REQUESTS);
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.PRINT_HOLD_REQUESTS} - ${FOLIO_SUFFIX}`,
      );

      // Step 24: Click on "View print details" and check title (starting from Ramsons)
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.VIEW_PRINT_DETAILS);
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - ${CIRCULATION_SETTINGS.VIEW_PRINT_DETAILS} - ${FOLIO_SUFFIX}`,
      );
    },
  );

  it(
    'C440060 Checking titles on "Settings -> Circulation" page (Edit page) (vega)',
    { tags: ['extendedPath', 'vega', 'C440060'] },
    () => {
      BaseCirculationPane.goToCirculationTab();

      // Step 1: Staff slips - select Hold, click Edit, check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.STAFF_SLIPS);
      StaffSlips.waitLoading();
      StaffSlips.chooseStaffClip(STAFF_SLIP_NAMES.HOLD);
      StaffSlip.edit(STAFF_SLIP_NAMES.HOLD);
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - Edit ${STAFF_SLIP_NAMES.HOLD} - ${FOLIO_SUFFIX}`,
      );
      BaseCirculationPane.cancelEditing();

      // Step 2: Fixed due date schedules - select schedule, click Actions > Edit, check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.FIXED_DUE_DATE_SCHEDULES);
      FixedDueDateSchedules.waitLoading();
      cy.contains(testData.fixedDueDateSchedule.name).click();
      FixedDueDateSchedules.clickActionsButton();
      FixedDueDateSchedules.clickEditButton();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - Edit ${testData.fixedDueDateSchedule.name} - ${FOLIO_SUFFIX}`,
      );
      FixedDueDateSchedules.cancelEditing();

      // Step 3: Loan policies - select policy, click Actions > Edit, check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.LOAN_POLICIES);
      LoanPolicy.waitLoading();
      LoanPolicy.selectLoanPolicyByName(testData.loanPolicy.name);
      LoanPolicy.clickActionsButton();
      LoanPolicy.clickEditButton();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - Edit ${testData.loanPolicy.name} - ${FOLIO_SUFFIX}`,
      );
      BaseCirculationPane.cancelEditing();

      // Step 4: Overdue fine policies - select policy, click Actions > Edit, check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.OVERDUE_FINE_POLICIES);
      OverdueFineUiPolicies.waitLoading();
      cy.contains(defaultOverdueFinePolicy.name).click();
      OverdueFineUiPolicies.openEditingForm();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - Edit ${defaultOverdueFinePolicy.name} - ${FOLIO_SUFFIX}`,
      );
      BaseCirculationPane.cancelEditing();

      // Step 5: Lost item fee policies - select policy, click Actions > Edit, check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.LOST_ITEM_FEE_POLICIES);
      LostItemFeePolicy.waitLoading();
      cy.contains(defaultLostItemFeePolicy.name).click();
      LostItemFeePolicy.startEditing();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - Edit ${defaultLostItemFeePolicy.name} - ${FOLIO_SUFFIX}`,
      );
      BaseCirculationPane.cancelEditing();

      // Step 6: Patron notice policies - select policy, click Actions > Edit, check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.PATRON_NOTICE_POLICIES);
      NewNoticePolicy.clickEditNoticePolicy(testData.noticePolicy);
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - Edit ${testData.noticePolicy.name} - ${FOLIO_SUFFIX}`,
      );
      BaseCirculationPane.cancelEditing();

      // Step 7: Patron notice templates - select template, click Actions > Edit, check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.PATRON_NOTICE_TEMPLATES);
      NoticeTemplates.waitLoading();
      NewNoticePolicyTemplate.editTemplate(testData.noticeTemplate.name);
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - Edit ${testData.noticeTemplate.name} - ${FOLIO_SUFFIX}`,
      );
      BaseCirculationPane.cancelEditing();

      // Step 8: Request policies - select policy, click Actions > Edit, check title
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.REQUEST_POLICIES);
      RequestPolicy.waitLoading();
      RequestPolicy.selectRequestPolicy(testData.requestPolicy.name);
      RequestPolicy.editRequestPolicy();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - Edit ${testData.requestPolicy.name} - ${FOLIO_SUFFIX}`,
      );
      BaseCirculationPane.cancelEditing();
    },
  );

  it(
    'C440061 Checking titles on "Settings -> Circulation" page (Create page) (vega)',
    { tags: ['extendedPath', 'vega', 'C440061'] },
    () => {
      BaseCirculationPane.goToCirculationTab();

      // Step 1: Fixed due date schedules - click +New, check title, cancel
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.FIXED_DUE_DATE_SCHEDULES);
      FixedDueDateSchedules.waitLoading();
      FixedDueDateSchedules.clickButtonNew();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - New fixed due date schedule - ${FOLIO_SUFFIX}`,
      );
      FixedDueDateSchedules.cancelCreating();

      // Step 2: Loan policies - click +New, check title, cancel
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.LOAN_POLICIES);
      LoanPolicy.waitLoading();
      LoanPolicy.clickNewButton();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - New loan policy - ${FOLIO_SUFFIX}`,
      );
      BaseCirculationPane.cancelEditing();

      // Step 3: Overdue fine policies - click +New, check title, cancel
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.OVERDUE_FINE_POLICIES);
      OverdueFineUiPolicies.waitLoading();
      OverdueFineUiPolicies.openCreatingForm();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - New overdue fine policy - ${FOLIO_SUFFIX}`,
      );
      BaseCirculationPane.cancelEditing();

      // Step 4: Lost item fee policies - click +New, check title, cancel
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.LOST_ITEM_FEE_POLICIES);
      LostItemFeePolicy.waitLoading();
      LostItemFeePolicy.startAdding();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - New lost item fee policy - ${FOLIO_SUFFIX}`,
      );
      BaseCirculationPane.cancelEditing();

      // Step 5: Patron notice policies - click +New, check title, cancel
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.PATRON_NOTICE_POLICIES);
      BaseCirculationPane.waitLoading('Patron notice policies');
      NewNoticePolicy.startAdding();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - New patron notice policy - ${FOLIO_SUFFIX}`,
      );
      BaseCirculationPane.cancelEditing();

      // Step 6: Patron notice templates - click +New, check title, cancel
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.PATRON_NOTICE_TEMPLATES);
      NoticeTemplates.waitLoading();
      NewNoticePolicyTemplate.startAdding();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - New patron notice template - ${FOLIO_SUFFIX}`,
      );
      BaseCirculationPane.cancelEditing();

      // Step 7: Request policies - click +New, check title, cancel
      BaseCirculationPane.goToSettingsCirculation(CIRCULATION_SETTINGS.REQUEST_POLICIES);
      RequestPolicy.waitLoading();
      RequestPolicy.clickNewPolicy();
      BaseCirculationPane.verifyPageTitle(
        `${CIRC_TITLE_PREFIX} - New request policy - ${FOLIO_SUFFIX}`,
      );
      BaseCirculationPane.cancelEditing();
    },
  );
});
