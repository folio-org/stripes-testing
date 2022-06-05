import TestType from '../../../../support/dictionary/testTypes';
import NewNoticePolicyTemplate from '../../../../support/fragments/circulation/newNoticePolicyTemplate';
import SettingsMenu from '../../../../support/fragments/settingsMenu';

describe('ui-circulation-settings: create patron notice template', () => {
  const patronNoticeTemplate = { ...NewNoticePolicyTemplate.defaultUi };
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(`${SettingsMenu.circulationPatronNoticeTemplatesPath}`);
  });

  it('C199656 Create notice template', { tags: [TestType.smoke] }, () => {
    NewNoticePolicyTemplate.clickNew();
    NewNoticePolicyTemplate.create(patronNoticeTemplate);
    NewNoticePolicyTemplate.save();
    NewNoticePolicyTemplate.check(patronNoticeTemplate);
    NewNoticePolicyTemplate.delete();
  });
});
