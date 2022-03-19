import TestType from '../../../../support/dictionary/testTypes';
import NewPatronNoticeTemplate from '../../../../support/fragments/circulation/newPatronNoticeTemplate';
import SettingsMenu from '../../../../support/fragments/settingsMenu';

describe('ui-circulation-settings: create patron notice template', () => {
  const patronNoticeTemplate = { ...NewPatronNoticeTemplate.defaultUiPatronNoticeTemplate };
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(`${SettingsMenu.circulationPatronNoticeTemplatesPath}`);
  });

  it('C199656 Create notice template', { tags: [TestType.smoke] }, () => {
    NewPatronNoticeTemplate.createTemplate(patronNoticeTemplate);
    NewPatronNoticeTemplate.checkTemplate(patronNoticeTemplate);
    NewPatronNoticeTemplate.deleteTemplate();
  });
});
