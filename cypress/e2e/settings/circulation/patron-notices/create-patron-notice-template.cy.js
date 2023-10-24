import devTeams from '../../../../support/dictionary/devTeams';
import TestType from '../../../../support/dictionary/testTypes';
import NewNoticePolicyTemplate from '../../../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import { NOTICE_CATEGORIES } from '../../../../support/fragments/settings/circulation/patron-notices/noticePolicies';

describe('ui-circulation-settings: create patron notice template', () => {
  const patronNoticeTemplate = {
    ...NewNoticePolicyTemplate.defaultUi,
    category: NOTICE_CATEGORIES.loan,
  };
  beforeEach('login', () => {
    cy.loginAsAdmin({
      path: SettingsMenu.circulationPatronNoticeTemplatesPath,
      waiter: NewNoticePolicyTemplate.waitLoading,
    });
  });

  it('C199656 Create notice template (vega)', { tags: [TestType.smoke, devTeams.vega] }, () => {
    NewNoticePolicyTemplate.startAdding();
    NewNoticePolicyTemplate.checkInitialState();
    NewNoticePolicyTemplate.addToken('item.title');
    NewNoticePolicyTemplate.create(patronNoticeTemplate);
    NewNoticePolicyTemplate.checkAfterSaving(patronNoticeTemplate);
    NewNoticePolicyTemplate.checkTemplateActions(patronNoticeTemplate);
    NewNoticePolicyTemplate.delete();
  });
});
