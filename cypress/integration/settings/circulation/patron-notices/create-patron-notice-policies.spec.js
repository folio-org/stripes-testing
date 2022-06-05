import TestType from '../../../../support/dictionary/testTypes';
import NewNoticePolicy from '../../../../support/fragments/circulation/NewNoticePolicy';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
// TO DO: update test with duplicate and edit methods, after PO will review test case.
describe('ui-circulation-settings: create patron notice policies', () => {
  const patronNoticePolicy = { ...NewNoticePolicy.defaultUiPatronNoticePolicies };
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(`${SettingsMenu.circulationPatronNoticePoliciesPath}`);
  });

  it('C6530 Create notice policy', { tags: [TestType.smoke] }, () => {
    NewNoticePolicy.clickNew();
    NewNoticePolicy.create(patronNoticePolicy);
    NewNoticePolicy.save(patronNoticePolicy);
    NewNoticePolicy.check(patronNoticePolicy.name);
    NewNoticePolicy.choosePolicy(patronNoticePolicy);
    NewNoticePolicy.duplicatePolicy(patronNoticePolicy);
    NewNoticePolicy.deletePolicy(patronNoticePolicy);
    NewNoticePolicy.choosePolicy(patronNoticePolicy);
    NewNoticePolicy.editPolicy(patronNoticePolicy);
    NewNoticePolicy.save(patronNoticePolicy);
    NewNoticePolicy.check(patronNoticePolicy.name);
    NewNoticePolicy.choosePolicy(patronNoticePolicy);
    NewNoticePolicy.deletePolicy(patronNoticePolicy);
  });
});
