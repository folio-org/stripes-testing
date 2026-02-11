import {
  LOAN_POLICY_NAMES,
  LOST_ITEM_FEES_POLICY_NAMES,
  NOTICE_POLICY_NAMES,
  OVERDUE_FINE_POLICY_NAMES,
  REQUEST_POLICY_NAMES,
} from '../../../../support/constants';
import CirculationRules from '../../../../support/fragments/circulation/circulation-rules';
import LoanPolicy, { defaultLoanPolicy } from '../../../../support/fragments/circulation/loan-policy';
import LostItemFeePolicy, {
  defaultLostItemFeePolicy,
} from '../../../../support/fragments/circulation/lost-item-fee-policy';
import OverdueFinePolicy, {
  defaultOverdueFinePolicy,
} from '../../../../support/fragments/circulation/overdue-fine-policy';
import RequestPolicy, {
  defaultRequestPolicy,
} from '../../../../support/fragments/circulation/request-policy';
import NoticePolicy, {
  defaultNoticePolicy,
} from '../../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import MaterialTypes from '../../../../support/fragments/settings/inventory/materialTypes';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Patron notices', () => {
  describe('Settings (Patron notices)', () => {
    const { user, memberTenant } = parseSanityParameters();
    const defaultMaterialType = MaterialTypes.getDefaultMaterialType();

    let addedCirculationRule;

    before(() => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();

      MaterialTypes.createMaterialTypeViaApi(defaultMaterialType);
      NoticePolicy.createApi();
      LoanPolicy.createLoanableNotRenewableLoanPolicyApi(defaultLoanPolicy);
      RequestPolicy.createViaApi(defaultRequestPolicy);
      LostItemFeePolicy.createViaApi();
      OverdueFinePolicy.createViaApi();

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: SettingsMenu.circulationRulesPath,
        waiter: () => cy.wait(5000),
      });
      cy.allure().logCommandSteps();
    });

    beforeEach(() => {
      cy.visit(SettingsMenu.circulationRulesPath);
    });

    after(() => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps();
      CirculationRules.deleteRuleViaApi(addedCirculationRule);
      MaterialTypes.deleteViaApi(defaultMaterialType.id);
      NoticePolicy.deleteViaApi(defaultNoticePolicy.id);
      LoanPolicy.deleteApi(defaultLoanPolicy.id);
      RequestPolicy.deleteViaApi(defaultRequestPolicy.id);
      LostItemFeePolicy.deleteViaApi(defaultLostItemFeePolicy.id);
      OverdueFinePolicy.deleteViaApi(defaultOverdueFinePolicy.id);
    });

    it(
      'C2268 Add notice policy to circulation rules (volaris)',
      { tags: ['dryRun', 'volaris', 'C2268'] },
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
  });
});
