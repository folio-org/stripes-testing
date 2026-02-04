import uuid from 'uuid';
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
import { getTestEntityValue } from '../../support/utils/stringTools';
import { CodeMirrorHint } from '../../../interactors';

describe('Patron notices', () => {
  describe('Settings (Patron notices)', () => {
    const defaultMaterialType = MaterialTypes.getDefaultMaterialType();

    let addedCirculationRule;
    let newUserId;
    const createdLoanPolicies = [];

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

    beforeEach(function () {
      // Skip beforeEach for C655 and C657 as they handle their own navigation
      if (this.currentTest.title.includes('C655') || this.currentTest.title.includes('C657')) {
        return;
      }
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
      createdLoanPolicies.forEach((policy) => {
        LoanPolicy.deleteApi(policy.id);
      });
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
      'C651 Test appropriate menu-type behavior (pre-colon=attributes; post-colon=policies) (vega)',
      { tags: ['extendedPath', 'vega', 'C651'] },
      () => {
        // Enter new line from end of existing rules
        CirculationRules.moveCursorFocusToTheEnd();
        CirculationRules.fillInNewLine();

        // Verify dropdown list of possible attributes is displayed
        cy.expect(CodeMirrorHint().exists());

        // Select attribute (m = Material types)
        CirculationRules.fillInCirculationRules('m ');

        // Verify dropdown list of values is displayed
        cy.expect(CodeMirrorHint().exists());

        // Select material type value from the list
        CirculationRules.clickCirculationRulesHintItem(defaultMaterialType.name);

        // Enter colon to indicate all desired attributes have been entered
        CirculationRules.fillInCirculationRules(': ');
        cy.wait(2000);
        CirculationRules.moveCursorFocusToTheEnd();

        // Verify dropdown list of policy types is displayed
        cy.expect(CodeMirrorHint().exists());

        // Select Loan policies type
        CirculationRules.clickCirculationRulesHintItemForPolicyType('Loan policies');

        // Verify dropdown list of Loan policy values is displayed
        cy.expect(CodeMirrorHint().exists());

        // Select a Loan policy from the list
        CirculationRules.clickCirculationRulesHintItem(LOAN_POLICY_NAMES.EXAMPLE_LOAN);

        // Navigate away without saving
        cy.visit(SettingsMenu.circulationRulesPath);
      },
    );

    it(
      'C652 Test menu auto-population of policy prefix syntax (vega)',
      { tags: ['extendedPath', 'vega', 'C652'] },
      () => {
        // Start typing a new rule
        CirculationRules.moveCursorFocusToTheEnd();
        CirculationRules.fillInNewLine();

        // Note dropdown list of criteria at start of new line
        cy.expect(CodeMirrorHint().exists());

        // Choose one of the criteria (m = Material types)
        CirculationRules.fillInCirculationRules('m ');

        // Note dropdown list of values for the criteria
        cy.expect(CodeMirrorHint().exists());

        // Choose one of the values
        CirculationRules.clickCirculationRulesHintItem(defaultMaterialType.name);

        // Type : (colon)
        CirculationRules.fillInCirculationRules(': ');
        cy.wait(2000);
        CirculationRules.moveCursorFocusToTheEnd();

        // Note dropdown list of policies (loan, request, patron notice, overdue fine, lost item fee)
        cy.expect(CodeMirrorHint().exists());

        // Choose Loan policy type and value
        CirculationRules.clickCirculationRulesHintItemForPolicyType('Loan policies');
        cy.expect(CodeMirrorHint().exists());
        CirculationRules.clickCirculationRulesHintItem(LOAN_POLICY_NAMES.EXAMPLE_LOAN);

        // Choose Request policy type and value
        CirculationRules.clickCirculationRulesHintItemForPolicyType('Request policies');
        cy.expect(CodeMirrorHint().exists());
        CirculationRules.clickCirculationRulesHintItem(REQUEST_POLICY_NAMES.ALLOW_ALL);

        // Choose Patron notice policy type and value
        CirculationRules.clickCirculationRulesHintItemForPolicyType('Patron notice policies');
        cy.expect(CodeMirrorHint().exists());
        CirculationRules.clickCirculationRulesHintItem(NOTICE_POLICY_NAMES.SEND_NO_NOTICES);

        // Choose Overdue fine policy type and value
        CirculationRules.clickCirculationRulesHintItemForPolicyType('Overdue fine policies');
        cy.expect(CodeMirrorHint().exists());
        CirculationRules.clickCirculationRulesHintItem(
          OVERDUE_FINE_POLICY_NAMES.OVERDUE_FINE_POLICY,
        );

        // Choose Lost item fee policy type and value
        CirculationRules.clickCirculationRulesHintItemForPolicyType('Lost item fee policies');
        cy.expect(CodeMirrorHint().exists());
        CirculationRules.clickCirculationRulesHintItem(
          LOST_ITEM_FEES_POLICY_NAMES.LOST_ITEM_FEES_POLICY,
        );

        // DO NOT save - navigate away from the circulation rule editor
        cy.visit(SettingsMenu.circulationRulesPath);
      },
    );

    it(
      'C653 Test menu updating (e.g., configuring new policies and/or attributes and ensure menu sees them) (vega)',
      { tags: ['extendedPath', 'vega', 'C653'] },
      () => {
        // Add new circulation rule with newly created material type
        CirculationRules.moveCursorFocusToTheEnd();
        CirculationRules.fillInNewLine();
        CirculationRules.fillInCirculationRules('m ');

        // Verify material type from preconditions displayed in the list
        cy.expect(CodeMirrorHint().exists());
        CirculationRules.clickCirculationRulesHintItem(defaultMaterialType.name);
        CirculationRules.fillInCirculationRules(': ');
        cy.wait(2000);
        CirculationRules.moveCursorFocusToTheEnd();

        // Check loan policy - verify new loan policy appears in dropdown
        CirculationRules.fillInCirculationRules('l ');
        cy.expect(CodeMirrorHint().exists());
        CirculationRules.clickCirculationRulesHintItem(defaultLoanPolicy.name);

        // Check request policy - verify new request policy appears in dropdown
        CirculationRules.fillInCirculationRules('r ');
        cy.expect(CodeMirrorHint().exists());
        CirculationRules.clickCirculationRulesHintItem(defaultRequestPolicy.name);

        // Check patron notice policy - verify new notice policy appears in dropdown
        CirculationRules.fillInCirculationRules('n ');
        cy.expect(CodeMirrorHint().exists());
        CirculationRules.clickCirculationRulesHintItem(defaultNoticePolicy.name);

        // Check overdue fine policy - verify new overdue policy appears in dropdown
        CirculationRules.fillInCirculationRules('o ');
        cy.expect(CodeMirrorHint().exists());
        CirculationRules.clickCirculationRulesHintItem(defaultOverdueFinePolicy.name);

        // Check lost item fee policy - verify new lost item fee policy appears in dropdown
        CirculationRules.fillInCirculationRules('i ');
        cy.expect(CodeMirrorHint().exists());
        CirculationRules.clickCirculationRulesHintItem(defaultLostItemFeePolicy.name);

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

    it('C655 Test ability to nest rules (vega)', { tags: ['extendedPath', 'vega', 'C655'] }, () => {
      // Navigate to circulation rules
      cy.visit(SettingsMenu.circulationRulesPath);

      // Clear and set up base rules
      CirculationRules.clearCirculationRules();
      CirculationRules.fillInPriority();

      CirculationRules.fillInFallbackPolicy({
        loanPolicyName: LOAN_POLICY_NAMES.EXAMPLE_LOAN,
        overdueFinePolicyName: OVERDUE_FINE_POLICY_NAMES.OVERDUE_FINE_POLICY,
        lostItemFeePolicyName: LOST_ITEM_FEES_POLICY_NAMES.LOST_ITEM_FEES_POLICY,
        requestPolicyName: REQUEST_POLICY_NAMES.ALLOW_ALL,
        noticePolicyName: NOTICE_POLICY_NAMES.SEND_NO_NOTICES,
      });

      // Add base rule with material type
      CirculationRules.fillInPolicy({
        priorityType: 'm ',
        priorityTypeName: defaultMaterialType.name,
        loanPolicyName: LOAN_POLICY_NAMES.EXAMPLE_LOAN,
        overdueFinePolicyName: OVERDUE_FINE_POLICY_NAMES.OVERDUE_FINE_POLICY,
        lostItemFeePolicyName: LOST_ITEM_FEES_POLICY_NAMES.LOST_ITEM_FEES_POLICY,
        requestPolicyName: REQUEST_POLICY_NAMES.ALLOW_ALL,
        noticePolicyName: NOTICE_POLICY_NAMES.SEND_NO_NOTICES,
      });

      // Add nested rule with indentation (4 spaces)
      CirculationRules.fillInCirculationRules('    m ');
      cy.expect(CodeMirrorHint().exists());
      CirculationRules.clickCirculationRulesHintItem(defaultMaterialType.name);
      CirculationRules.fillInCirculationRules(': ');
      cy.wait(2000);
      CirculationRules.moveCursorFocusToTheEnd();

      // Add policies for nested rule using custom policies
      CirculationRules.fillInCirculationRules('l ');
      CirculationRules.clickCirculationRulesHintItem(defaultLoanPolicy.name);
      CirculationRules.fillInCirculationRules('r ');
      CirculationRules.clickCirculationRulesHintItem(defaultRequestPolicy.name);
      CirculationRules.fillInCirculationRules('n ');
      CirculationRules.clickCirculationRulesHintItem(defaultNoticePolicy.name);
      CirculationRules.fillInCirculationRules('o ');
      CirculationRules.clickCirculationRulesHintItem(defaultOverdueFinePolicy.name);
      CirculationRules.fillInCirculationRules('i ');
      CirculationRules.clickCirculationRulesHintItem(defaultLostItemFeePolicy.name);

      // Build the nested rule string for verification
      const nestedCirculationRule =
        '    m ' +
        defaultMaterialType.id +
        ' : l ' +
        defaultLoanPolicy.id +
        ' r ' +
        defaultRequestPolicy.id +
        ' n ' +
        defaultNoticePolicy.id +
        ' o ' +
        defaultOverdueFinePolicy.id +
        ' i ' +
        defaultLostItemFeePolicy.id;

      // Save the circulation rules
      CirculationRules.saveCirculationRules();
      CirculationRules.checkUpdateCirculationRulesCalloutAppeared();

      // Verify the nested rule was saved correctly via API
      CirculationRules.checkCirculationRulesContainTextViaApi(nestedCirculationRule);

      // Cleanup: Delete the nested rule
      cy.getAdminToken();
      if (nestedCirculationRule) {
        CirculationRules.deleteRuleViaApi(nestedCirculationRule);
      }
    });

    it(
      'C657 Ensure menu supports longer list of options (e.g., 20+) (vega)',
      { tags: ['extendedPath', 'vega', 'C657'] },
      () => {
        // Create 20+ loan policies for testing dropdown with many items
        cy.getAdminToken();
        for (let i = 0; i < 22; i++) {
          const loanPolicy = {
            id: uuid(),
            name: `${getTestEntityValue()}-${i}`,
            loanable: true,
            loansPolicy: {
              closedLibraryDueDateManagementId: 'CURRENT_DUE_DATE_TIME',
              period: { duration: 1, intervalId: 'Hours' },
              profileId: 'Rolling',
            },
            renewable: false,
          };
          LoanPolicy.createViaApi(loanPolicy).then(() => {
            createdLoanPolicies.push(loanPolicy);
          });
        }

        // Wait for all policies to be created
        cy.wait(3000);

        // Navigate to circulation rules
        cy.visit(SettingsMenu.circulationRulesPath);

        // Start creating a new circulation rule
        CirculationRules.moveCursorFocusToTheEnd();
        CirculationRules.fillInNewLine();

        // Add material type criteria
        CirculationRules.fillInCirculationRules('m ');
        cy.expect(CodeMirrorHint().exists());
        CirculationRules.clickCirculationRulesHintItem(defaultMaterialType.name);

        // Add colon to move to policy selection
        CirculationRules.fillInCirculationRules(': ');
        cy.wait(2000);
        CirculationRules.moveCursorFocusToTheEnd();

        // Type 'l ' to trigger loan policy dropdown
        CirculationRules.fillInCirculationRules('l ');

        // Verify dropdown appears
        cy.expect(CodeMirrorHint().exists());

        // Verify all loan policies are displayed (at least 20)
        cy.get('.CodeMirror-hints .CodeMirror-hint').should('have.length.at.least', 20);

        // Verify that created policies appear in the dropdown
        createdLoanPolicies.slice(0, 3).forEach((policy) => {
          cy.get('.CodeMirror-hints').should('contain.text', policy.name);
        });

        // Navigate away without saving
        cy.visit(SettingsMenu.circulationRulesPath);
      },
    );
  });
});
