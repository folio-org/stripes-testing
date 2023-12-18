import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import TopMenu from '../../support/fragments/topMenu';

describe('ui-organizations: Filtering organization', () => {
  const organization = { ...NewOrganization.specialOrganization };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    cy.visit(TopMenu.organizationsPath);
  });

  after(() => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(organization.id);
  });
  [
    { filterActions: Organizations.selectActiveStatus },
    { filterActions: Organizations.selectYesInIsVendor },
    { filterActions: Organizations.selectCountryFilter },
    { filterActions: Organizations.selectLanguageFilter },
    { filterActions: Organizations.selectCashInPaymentMethod },
  ].forEach((filter) => {
    it(
      'C6713: Test the Organizations app filters (except Tags) (thunderjet)',
      { tags: ['smoke', 'thunderjet'] },
      () => {
        // cy.visit(TopMenu.organizationsPath);
        filter.filterActions();
        Organizations.checkOrganizationFilter();
        Organizations.selectOrganization(organization.name);
        Organizations.checkOrganizationInfo(organization);
        Organizations.resetFilters();
      },
    );
  });
});
