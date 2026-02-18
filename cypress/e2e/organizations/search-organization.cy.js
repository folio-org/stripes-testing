import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import OrganizationsSearchAndFilter from '../../support/fragments/organizations/organizationsSearchAndFilter';
import TopMenu from '../../support/fragments/topMenu';

describe('Organizations', () => {
  const organization = { ...NewOrganization.specialOrganization };

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    cy.loginAsAdmin({
      path: TopMenu.organizationsPath,
      waiter: Organizations.waitLoading,
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
      { tags: ['smoke', 'thunderjet', 'C6712', 'shiftLeft'] },
      () => {
        OrganizationsSearchAndFilter.searchByParameters(searcher.parameter, searcher.value);
        Organizations.checkSearchResults(organization);
        Organizations.resetFilters();
      },
    );
  });
});
