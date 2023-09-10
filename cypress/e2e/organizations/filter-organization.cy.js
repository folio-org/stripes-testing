import TopMenu from '../../support/fragments/topMenu';
import TestType from '../../support/dictionary/testTypes';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import devTeams from '../../support/dictionary/devTeams';

describe('ui-organizations: Filtering organization', () => {
  const organization = { ...NewOrganization.specialOrganization };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
  });

  after(() => {
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
      { tags: [TestType.smoke, devTeams.thunderjet] },
      () => {
        cy.visit(TopMenu.organizationsPath);
        filter.filterActions();
        Organizations.checkOrganizationFilter();
        Organizations.selectOrganization(organization.name);
        Organizations.checkOpenOrganizationInfo(organization);
        Organizations.resetFilters();
      },
    );
  });
});
