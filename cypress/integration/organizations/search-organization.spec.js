import TopMenu from '../../support/fragments/topMenu';
import TestType from '../../support/dictionary/testTypes';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';

describe('ui-organizations: Search organization', () => {
  const organization = { ...NewOrganization.specialOrganization };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getAdminToken();
    Organizations.createOrganizationApi(organization)
      .then(response => {
        organization.id = response;
      });
  });

  after(() => {
    Organizations.deleteOrganizationApi(organization.id);
  });

  [
    { parameter: 'All', value: organization.name },
    { parameter: 'Name', value: organization.name },
    { parameter: 'Code', value: organization.code },
    { parameter: 'Language', value: organization.language },
    { parameter: 'Alias', value: organization.aliases[0].value },
    { parameter: 'Accounting code', value: organization.erpCode },
    { parameter: 'Tax ID', value: organization.taxId },
  ].forEach((searcher) => {
    it('C6712 Test the Organizations app searches (thunderjet)', { tags: [TestType.smoke] }, () => {
      cy.visit(TopMenu.organizationsPath);
      Organizations.searchByParameters(searcher.parameter, searcher.value);
      Organizations.checkSearchResults(organization);
      Organizations.resetFilters();
    });
  });
});
