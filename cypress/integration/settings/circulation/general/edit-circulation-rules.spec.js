import devTeams from '../../../../support/dictionary/devTeams';
import TestType from '../../../../support/dictionary/testTypes';
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

describe('ui-circulation-settings: Edit circulation rules', () => {
  let originalCirculationRules;
  let newUserId;

  beforeEach(() => {
    cy.createTempUser([
      permissions.uiCirculationViewCreateEditDelete.gui,
    ]).then(({
      username,
      password,
      userId,
    }) => {
      newUserId = userId;

      cy.getAdminToken();

      CirculationRules.getApi().then((circulationRules) => {
        originalCirculationRules = circulationRules;
      });
      NewMaterialType.createViaApi(NewMaterialType.getDefaultMaterialType());
      NoticePolicy.createApi();
      LoanPolicy.createLoanableNotRenewableLoanPolicyApi(defaultLoanPolicy);
      RequestPolicy.createApi();
      LostItemFeePolicy.createViaApi();
      OverdueFinePolicy.createApi();

      cy.login(username, password);
    });

    cy.visit(SettingsMenu.circulationRulesPath);
  });

  afterEach(() => {
    CirculationRules.updateApi(originalCirculationRules);
    MaterialTypes.deleteApi(defaultMaterialType.id);
    NoticePolicy.deleteApi(defaultNoticePolicy.id);
    LoanPolicy.deleteApi(defaultLoanPolicy.id);
    RequestPolicy.deleteApi(defaultRequestPolicy.id);
    LostItemFeePolicy.deleteViaApi(defaultLostItemFeePolicy.id);
    OverdueFinePolicy.deleteApi(defaultOverdueFinePolicy.id);
    Users.deleteViaApi(newUserId);
  });

  it('C2268: Add notice policy to circulation rules (vega)', { tags: [TestType.smoke, devTeams.vega] }, () => {
    CirculationRules.clearCirculationRules();
    CirculationRules.fillInPriority();

    CirculationRules.fillInFallbackPolicy({
      loanPolicyName: defaultLoanPolicy.name,
      overdueFinePolicyName: defaultOverdueFinePolicy.name,
      lostItemFeePolicyName: defaultLostItemFeePolicy.name,
      requestPolicyName: defaultRequestPolicy.name,
      noticePolicyName: defaultNoticePolicy.name,
    });

    CirculationRules.fillInPolicy({
      priorityType: 'm ',
      priorityTypeName: defaultMaterialType.name,
      loanPolicyName: defaultLoanPolicy.name,
      overdueFinePolicyName: defaultOverdueFinePolicy.name,
      lostItemFeePolicyName: defaultLostItemFeePolicy.name,
      requestPolicyName: defaultRequestPolicy.name,
      noticePolicyName: defaultNoticePolicy.name,
    });

    CirculationRules.saveCirculationRules();

    CirculationRules.checkUpdateCirculationRulesCalloutAppeared();
    CirculationRules.checkNoticePolicyAddedToCirculationRules(defaultNoticePolicy.id);
  });
});
