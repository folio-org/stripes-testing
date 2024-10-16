import TopMenu from '../../../support/fragments/topMenu';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';

describe('fse-organizations - UI for production tenants', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195376 - verify that organizations page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'organizations'] },
    () => {
      cy.visit(TopMenu.organizationsPath);
      Organizations.waitLoading();
    },
  );
});

describe('fse-organizations - UI for non-production tenants', () => {
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const defaultInterface = { ...NewOrganization.defaultInterface };

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  afterEach(() => {
    cy.allure().logCommandSteps(false);
    cy.getAdminToken();
    cy.allure().logCommandSteps();
    Organizations.getOrganizationViaApi({ query: `name="${organization.name}"` }).then(
      (returnedOrganization) => {
        Organizations.deleteOrganizationViaApi(returnedOrganization.id);
      },
    );
  });

  it(
    `TC195623 - create organization and assign interfase for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['nonProd', 'fse', 'ui', 'organizations'] },
    () => {
      // create new organization via UI
      cy.visit(TopMenu.organizationsPath);
      Organizations.createOrganizationViaUi(organization);
      Organizations.checkOrganizationInfo(organization);
      // assign an interface
      Organizations.editOrganization();
      Organizations.addNewInterface(defaultInterface);
      Organizations.closeInterface();
      Organizations.addIntrefaceToOrganization(defaultInterface);
      Organizations.checkInterfaceIsAdd(defaultInterface);
      Organizations.editOrganization();
      Organizations.selectInterface(defaultInterface);
      Organizations.deleteInterface();
    },
  );
});
