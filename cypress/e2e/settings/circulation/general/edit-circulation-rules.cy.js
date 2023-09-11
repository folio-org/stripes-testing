import devTeams from '../../../../support/dictionary/devTeams';
import TestType from '../../../../support/dictionary/testTypes';
import Parallelization from '../../../../support/dictionary/parallelization';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import CirculationRules from '../../../../support/fragments/circulation/circulation-rules';
import OverdueFinePolicy, {
  defaultOverdueFinePolicy,
} from '../../../../support/fragments/circulation/overdue-fine-policy';
import LostItemFeePolicy, {
  defaultLostItemFeePolicy,
} from '../../../../support/fragments/circulation/lost-item-fee-policy';
import RequestPolicy, {
  defaultRequestPolicy,
} from '../../../../support/fragments/circulation/request-policy';
import LoanPolicy, {
  defaultLoanPolicy,
} from '../../../../support/fragments/circulation/loan-policy';
import NoticePolicy, {
  defaultNoticePolicy,
} from '../../../../support/fragments/circulation/notice-policy';
import MaterialTypes from '../../../../support/fragments/settings/inventory/materialTypes';
import permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import NewMaterialType, {
  defaultMaterialType,
} from '../../../../support/fragments/settings/inventory/newMaterialType';
import {
  LOAN_POLICY_NAMES,
  OVERDUE_FINE_POLICY_NAMES,
  LOST_ITEM_FEES_POLICY_NAMES,
  NOTICE_POLICY_NAMES,
  REQUEST_POLICY_NAMES,
} from '../../../../support/constants';

describe('ui-circulation-settings: Edit circulation rules', () => {
  let addedCirculationRule;
  let newUserId;

  before(() => {
    cy.createTempUser([permissions.uiCirculationViewCreateEditDelete.gui]).then(
      ({ username, password, userId }) => {
        newUserId = userId;

        cy.getAdminToken();

        NewMaterialType.createViaApi(NewMaterialType.getDefaultMaterialType());
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
    CirculationRules.deleteRuleViaApi(addedCirculationRule);
    MaterialTypes.deleteApi(defaultMaterialType.id);
    NoticePolicy.deleteViaApi(defaultNoticePolicy.id);
    LoanPolicy.deleteApi(defaultLoanPolicy.id);
    RequestPolicy.deleteViaApi(defaultRequestPolicy.id);
    LostItemFeePolicy.deleteViaApi(defaultLostItemFeePolicy.id);
    OverdueFinePolicy.deleteViaApi(defaultOverdueFinePolicy.id);
    Users.deleteViaApi(newUserId);
  });

  it(
    'C2268: Add notice policy to circulation rules (vega)',
    { tags: [TestType.smoke, devTeams.vega, Parallelization.nonParallel] },
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
    'C654: Test behavior for incomplete vs complete circulation rules (i.e., all policy types must be present; else error)',
    { tags: [TestType.smoke, devTeams.vega, Parallelization.nonParallel] },
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
    'C656: Ensure interface alerts user of syntax errors in rules',
    { tags: [TestType.smoke, devTeams.vega, Parallelization.nonParallel] },
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
