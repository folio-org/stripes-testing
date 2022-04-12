import TopMenu from '../../support/fragments/topMenu';
import TestType from '../../support/dictionary/testTypes';
import Organizations from '../../support/fragments/organizations/organizations';

describe('ui-organizations: View organization', () => {
  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.organizationsPath);
  });

  it('C672 View existing organization record', { tags: [TestType.smoke] }, () => {
    Organizations.selectActiveStatus();
    Organizations.checkOrganizationFilter();
    Organizations.chooseOrganizationFromList();
    Organizations.checkOpenOrganizationInfo();
  });
});
