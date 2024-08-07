import NewNoticePolicyTemplate from '../../../../support/fragments/settings/circulation/patron-notices/newNoticePolicyTemplate';
import { NOTICE_CATEGORIES } from '../../../../support/fragments/settings/circulation/patron-notices/noticePolicies';
import SettingsMenu from '../../../../support/fragments/settingsMenu';

describe('Settings (Notices)', () => {
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

  it('C199656 Create notice template (volaris)', { tags: ['smoke', 'volaris'] }, () => {
    NewNoticePolicyTemplate.startAdding();
    NewNoticePolicyTemplate.checkInitialState();
    NewNoticePolicyTemplate.addToken('item.title');
    NewNoticePolicyTemplate.create(patronNoticeTemplate);
    NewNoticePolicyTemplate.checkAfterSaving(patronNoticeTemplate);
    NewNoticePolicyTemplate.checkTemplateActions(patronNoticeTemplate);
    NewNoticePolicyTemplate.delete();
  });

  it(
    'C356783, C357005 Notice template validations (volaris)',
    { tags: ['extendedPath', 'volaris'] },
    () => {
      NewNoticePolicyTemplate.startAdding();
      NewNoticePolicyTemplate.checkInitialState();
      NewNoticePolicyTemplate.checkSubjectEmptyError();

      NewNoticePolicyTemplate.startAdding();
      NewNoticePolicyTemplate.checkInitialState();
      NewNoticePolicyTemplate.checkRichTextEditor();
    },
  );
});
