import NewNoticePolicyTemplate from '../../../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import { NOTICE_CATEGORIES } from '../../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import SettingsMenu from '../../../../support/fragments/settingsMenu';

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

  it('C199656 Create notice template (vega)', { tags: ['smoke', 'volaris'] }, () => {
    NewNoticePolicyTemplate.startAdding();
    NewNoticePolicyTemplate.checkInitialState();
    NewNoticePolicyTemplate.addToken('item.title');
    NewNoticePolicyTemplate.create(patronNoticeTemplate);
    NewNoticePolicyTemplate.checkAfterSaving(patronNoticeTemplate);
    NewNoticePolicyTemplate.checkTemplateActions(patronNoticeTemplate);
    NewNoticePolicyTemplate.delete();
  });
});
