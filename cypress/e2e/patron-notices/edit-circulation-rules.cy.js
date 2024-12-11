import {
  LOAN_POLICY_NAMES,
  LOST_ITEM_FEES_POLICY_NAMES,
  NOTICE_POLICY_NAMES,
  OVERDUE_FINE_POLICY_NAMES,
  REQUEST_POLICY_NAMES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import CirculationRules from '../../support/fragments/circulation/circulation-rules';
import LoanPolicy, { defaultLoanPolicy } from '../../support/fragments/circulation/loan-policy';
import LostItemFeePolicy, {
  defaultLostItemFeePolicy,
} from '../../support/fragments/circulation/lost-item-fee-policy';
import OverdueFinePolicy, {
  defaultOverdueFinePolicy,
} from '../../support/fragments/circulation/overdue-fine-policy';
import RequestPolicy, {
  defaultRequestPolicy,
} from '../../support/fragments/circulation/request-policy';
import NoticePolicy, {
  defaultNoticePolicy,
} from '../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Users from '../../support/fragments/users/users';

describe('Patron notices', () => {
  describe('Settings (Patron notices)', () => {
    const defaultMaterialType = MaterialTypes.getDefaultMaterialType();

    let addedCirculationRule;
    let newUserId;

    before(() => {
      cy.createTempUser([Permissions.uiCirculationViewCreateEditDelete.gui]).then(
        ({ username, password, userId }) => {
          newUserId = userId;

          cy.getAdminToken();

          MaterialTypes.createMaterialTypeViaApi(defaultMaterialType);
          NoticePolicy.createApi();
          LoanPolicy.createLoanableNotRenewableLoanPolicyApi(defaultLoanPolicy);
          RequestPolicy.createViaApi(defaultRequestPolicy);
          LostItemFeePolicy.createViaApi();
          OverdueFinePolicy.createViaApi();

          cy.login(username, password);
        },
      );
    });

    beforeEach(() => {
      cy.visit(SettingsMenu.circulationRulesPath);
    });

    after(() => {
      cy.getAdminToken();
      CirculationRules.deleteRuleViaApi(addedCirculationRule);
      MaterialTypes.deleteViaApi(defaultMaterialType.id);
      NoticePolicy.deleteViaApi(defaultNoticePolicy.id);
      LoanPolicy.deleteApi(defaultLoanPolicy.id);
      RequestPolicy.deleteViaApi(defaultRequestPolicy.id);
      LostItemFeePolicy.deleteViaApi(defaultLostItemFeePolicy.id);
      OverdueFinePolicy.deleteViaApi(defaultOverdueFinePolicy.id);
      Users.deleteViaApi(newUserId);
    });

    it(
      'C650 Test adding fallback policies (loan, request, notice, overdue, lost item) (vega) (TaaS)',
      { tags: ['criticalPath', 'vega', 'C650'] },
      () => {
        // Delete Circulation Rules
        CirculationRules.clearCirculationRules();
        // Fill in priority
        CirculationRules.fillInPriority();

        // Enter fallback-policy:
        CirculationRules.fillInCirculationRules('fallback-policy: ');
        CirculationRules.moveCursorFocusToTheEnd();

        // A dropdown list of policy types is displayed
        // Choose Lost item fee policies and choose a value for that policy
        CirculationRules.clickCirculationRulesHintItemForPolicyType('Lost item fee policies');
        CirculationRules.clickCirculationRulesHintItem(
          LOST_ITEM_FEES_POLICY_NAMES.LOST_ITEM_FEES_POLICY,
        );

        // Choose Loan policies and choose a value for that policy
        CirculationRules.clickCirculationRulesHintItemForPolicyType('Loan policies');
        CirculationRules.clickCirculationRulesHintItem(LOAN_POLICY_NAMES.EXAMPLE_LOAN);

        // Choose Overdue fine policies and choose a value for that policy
        CirculationRules.clickCirculationRulesHintItemForPolicyType('Overdue fine policies');
        CirculationRules.clickCirculationRulesHintItem(
          OVERDUE_FINE_POLICY_NAMES.OVERDUE_FINE_POLICY,
        );

        // Choose Request policies and choose a value for that policy
        CirculationRules.clickCirculationRulesHintItemForPolicyType('Request policies');
        CirculationRules.clickCirculationRulesHintItem(REQUEST_POLICY_NAMES.ALLOW_ALL);

        // Choose Patron notice policies and choose a value for that policy
        CirculationRules.clickCirculationRulesHintItemForPolicyType('Patron notice policies');
        CirculationRules.clickCirculationRulesHintItem(NOTICE_POLICY_NAMES.SEND_NO_NOTICES);

        // Navigate away without saving
        cy.visit(SettingsMenu.circulationRulesPath);
      },
    );

    it(
      'C2268 Add notice policy to circulation rules (volaris)',
      { tags: ['smoke', 'volaris', 'system', 'shiftLeft', 'C2268'] },
      () => {
        CirculationRules.clearCirculationRules();
        CirculationRules.fillInPriority();

        CirculationRules.fillInFallbackPolicy({
          loanPolicyName: LOAN_POLICY_NAMES.EXAMPLE_LOAN,
          overdueFinePolicyName: OVERDUE_FINE_POLICY_NAMES.OVERDUE_FINE_POLICY,
          lostItemFeePolicyName: LOST_ITEM_FEES_POLICY_NAMES.LOST_ITEM_FEES_POLICY,
          requestPolicyName: REQUEST_POLICY_NAMES.ALLOW_ALL,
          noticePolicyName: NOTICE_POLICY_NAMES.SEND_NO_NOTICES,
        });

        CirculationRules.fillInPolicy({
          priorityType: 'm ',
          priorityTypeName: defaultMaterialType.name,
          lostItemFeePolicyName: defaultLostItemFeePolicy.name,
          loanPolicyName: defaultLoanPolicy.name,
          requestPolicyName: defaultRequestPolicy.name,
          overdueFinePolicyName: defaultOverdueFinePolicy.name,
          noticePolicyName: defaultNoticePolicy.name,
        });
        addedCirculationRule =
          'm ' +
          defaultMaterialType.id +
          ' : l ' +
          defaultLoanPolicy.id +
          ' o ' +
          defaultOverdueFinePolicy.id +
          ' i ' +
          defaultLostItemFeePolicy.id +
          ' r ' +
          defaultRequestPolicy.id +
          ' n ' +
          defaultNoticePolicy.id;

        CirculationRules.saveCirculationRules();

        CirculationRules.checkUpdateCirculationRulesCalloutAppeared();
        CirculationRules.checkNoticePolicyAddedToCirculationRules(defaultNoticePolicy.id);
      },
    );

    it(
      'C654 Test behavior for incomplete vs complete circulation rules (i.e., all policy types must be present; else error) (vega)',
      { tags: ['extendedPath', 'vega', 'C654'] },
      () => {
        CirculationRules.clearCirculationRules();
        CirculationRules.fillInPriority();

        CirculationRules.fillInFallbackPolicy({
          loanPolicyName: LOAN_POLICY_NAMES.EXAMPLE_LOAN,
          overdueFinePolicyName: OVERDUE_FINE_POLICY_NAMES.OVERDUE_FINE_POLICY,
          lostItemFeePolicyName: LOST_ITEM_FEES_POLICY_NAMES.LOST_ITEM_FEES_POLICY,
          requestPolicyName: REQUEST_POLICY_NAMES.ALLOW_ALL,
          noticePolicyName: NOTICE_POLICY_NAMES.SEND_NO_NOTICES,
        });

        CirculationRules.fillInPolicy({
          priorityType: 'm ',
          priorityTypeName: defaultMaterialType.name,
          lostItemFeePolicyName: defaultLostItemFeePolicy.name,
          loanPolicyName: defaultLoanPolicy.name,
          requestPolicyName: defaultRequestPolicy.name,
          overdueFinePolicyName: defaultOverdueFinePolicy.name,
        });

        CirculationRules.saveCirculationRules();
        CirculationRules.verifyErrorMessageMissingNType();
      },
    );

    it(
      'C656 Ensure interface alerts user of syntax errors in rules',
      { tags: ['criticalPath', 'vega', 'C656'] },
      () => {
        CirculationRules.clearCirculationRules();
        CirculationRules.fillInPriority();

        CirculationRules.fillInFallbackPolicy({
          loanPolicyName: LOAN_POLICY_NAMES.EXAMPLE_LOAN,
          overdueFinePolicyName: OVERDUE_FINE_POLICY_NAMES.OVERDUE_FINE_POLICY,
          lostItemFeePolicyName: LOST_ITEM_FEES_POLICY_NAMES.LOST_ITEM_FEES_POLICY,
          requestPolicyName: REQUEST_POLICY_NAMES.ALLOW_ALL,
          noticePolicyName: NOTICE_POLICY_NAMES.SEND_NO_NOTICES,
        });

        CirculationRules.fillInCirculationRules('wrong rules');
        CirculationRules.moveCursorFocusToTheEnd();

        CirculationRules.saveCirculationRules();
        CirculationRules.verifyErrorMessageWrongInput();
      },
    );
  });
});
