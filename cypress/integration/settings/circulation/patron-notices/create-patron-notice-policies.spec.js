import TestType from '../../../../support/dictionary/testTypes';
import NewPatronNoticePolicies from '../../../../support/fragments/circulation/newPatronNoticePolicies';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
// TO DO: update test with duplicate and edit methods, after PO will review test case.
describe('ui-circulation-settings: create patron notice policies', () => {
  const patronNoticePolicy = { ...NewPatronNoticePolicies.defaultUiPatronNoticePolicies };
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(`${SettingsMenu.circulationPatronNoticePoliciesPath}`);
  });

  it('C6530 Create notice policy', { tags: [TestType.smoke] }, () => {
    NewPatronNoticePolicies.createPolicy(patronNoticePolicy);
    NewPatronNoticePolicies.savePolicy(patronNoticePolicy);
    NewPatronNoticePolicies.checkPolicy(patronNoticePolicy.name);
    NewPatronNoticePolicies.choosePolicy(patronNoticePolicy);
    NewPatronNoticePolicies.duplicatePolicy(patronNoticePolicy);
    NewPatronNoticePolicies.deletePolicy(patronNoticePolicy);
    NewPatronNoticePolicies.choosePolicy(patronNoticePolicy);
    NewPatronNoticePolicies.editPolicy(patronNoticePolicy);
    NewPatronNoticePolicies.savePolicy(patronNoticePolicy);
    NewPatronNoticePolicies.checkPolicy(patronNoticePolicy.name);
    NewPatronNoticePolicies.choosePolicy(patronNoticePolicy);
    NewPatronNoticePolicies.deletePolicy(patronNoticePolicy);
  });
});
