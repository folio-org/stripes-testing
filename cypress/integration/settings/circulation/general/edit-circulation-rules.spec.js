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
import MaterialTypesSettings, {
  defaultMaterialType,
} from '../../../../support/fragments/inventory/materialType/materialTypesSettings';
import permissions from '../../../../support/dictionary/permissions';

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
      MaterialTypesSettings.createApi(MaterialTypesSettings.getDefaultMaterialType());
      NoticePolicy.createApi();
      LoanPolicy.createApi();
      RequestPolicy.createApi();
      LostItemFeePolicy.createApi();
      OverdueFinePolicy.createApi();

      cy.login(username, password);
    });

    cy.visit(SettingsMenu.circulationRulesPath);
  });

  afterEach(() => {
    CirculationRules.updateApi(originalCirculationRules);
    MaterialTypesSettings.deleteApi(defaultMaterialType.id);
    NoticePolicy.deleteApi(defaultNoticePolicy.id);
    LoanPolicy.deleteApi(defaultLoanPolicy.id);
    RequestPolicy.deleteApi(defaultRequestPolicy.id);
    LostItemFeePolicy.deleteApi(defaultLostItemFeePolicy.id);
    OverdueFinePolicy.deleteApi(defaultOverdueFinePolicy.id);
    cy.deleteUser(newUserId);
  });

  it('C2268: Add notice policy to circulation rules', { tags: [TestType.smoke] }, () => {
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
      materialTypeName: defaultMaterialType.name,
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
