import TestType from '../../../../support/dictionary/testTypes';
import CirculationMenu from '../../../../support/fragments/circulation/circulationsMenu';
import NewPatronNoticePolicies from '../../../../support/fragments/circulation/newPatronNoticePolicies';

describe('ui-circulation-settings: create patron notice policies', () => {
  const patronNoticePolicy = { ...NewPatronNoticePolicies.defaultUiPatronNoticePolicies };
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(`${CirculationMenu.patronNoticePolicies}`);
  });

  it('C6530 Create notice policy', { tags: [TestType.smoke] }, () => {
    NewPatronNoticePolicies.createPolicy(patronNoticePolicy);
    NewPatronNoticePolicies.checkPolicy(patronNoticePolicy.name);
    NewPatronNoticePolicies.choosePolicy(patronNoticePolicy);
    NewPatronNoticePolicies.duplicatePolicy(patronNoticePolicy);
    NewPatronNoticePolicies.deletePolicy(patronNoticePolicy);
    NewPatronNoticePolicies.choosePolicy(patronNoticePolicy);
    NewPatronNoticePolicies.editPolicy(patronNoticePolicy);
    NewPatronNoticePolicies.checkPolicy(patronNoticePolicy.name);
    NewPatronNoticePolicies.deletePolicy(patronNoticePolicy);
  });
});
