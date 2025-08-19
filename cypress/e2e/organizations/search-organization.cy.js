import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';

describe('ui-organizations: Search organization', () => {
  const organization = { ...NewOrganization.specialOrganization };

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
  });

  after(() => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization.id);
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
    it(
      'C6712 Test the Organizations app searches (thunderjet)',
      { tags: ['smokeBroken', 'thunderjet', 'shiftLeft', 'eurekaPhase1'] },
      () => {
        cy.visit(TopMenu.organizationsPath);
        Organizations.searchByParameters(searcher.parameter, searcher.value);
        Organizations.checkSearchResults(organization);
        Organizations.resetFilters();
      },
    );
  });
});
