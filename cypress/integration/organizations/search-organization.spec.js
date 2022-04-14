import TopMenu from '../../support/fragments/topMenu';
import TestType from '../../support/dictionary/testTypes';
import Organizations from '../../support/fragments/organizations/organizations';
import newOrganization from '../../support/fragments/organizations/newOrganization';

describe('ui-organizations: Search organization', () => {
  const organization = { ...newOrganization.specialOrganization };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.createOrganizationApi(organization);
  });

  after(() => {
    cy.getOrganizationApi({ query: `name="${organization.name}"` })
      .then(returnedOrganization => {
        cy.deleteOrganizationApi(returnedOrganization.id);
      });
  });

  it('C6712 Test the Organizations app searches', { tags: [TestType.smoke] }, () => {
    cy.visit(TopMenu.organizationsPath);
    Organizations.searchByParameters('All', organization.name);
    Organizations.checkSearchResults(organization);
    Organizations.resetFilters();
    Organizations.searchByParameters('Name', organization.name);
    Organizations.checkSearchResults(organization);
    Organizations.resetFilters();
    Organizations.searchByParameters('Code', organization.code);
    Organizations.checkSearchResults(organization);
    Organizations.resetFilters();
    Organizations.searchByParameters('Language', organization.language);
    Organizations.checkSearchResults(organization);
    Organizations.resetFilters();
    Organizations.searchByParameters('Alias', organization.aliases[0].value);
    Organizations.checkSearchResults(organization);
    Organizations.resetFilters();
    Organizations.searchByParameters('Accounting code', organization.erpCode);
    Organizations.checkSearchResults(organization);
    Organizations.resetFilters();
    Organizations.searchByParameters('Tax ID', organization.taxId);
    Organizations.checkSearchResults(organization);
    Organizations.resetFilters();
  });
});
