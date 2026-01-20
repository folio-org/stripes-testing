// Configuration: Get tenant IDs from ECS_TENANT_IDS variable or use current tenant
const ecsTenantIds = Cypress.env('ECS_TENANT_IDS');
const tenantIds =
  ecsTenantIds && ecsTenantIds.length > 0 ? ecsTenantIds : [Cypress.env('OKAPI_TENANT')];

describe('fse-timers', () => {
  // Get token once for all tests
  before(() => {
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  // Run test for each tenant ID
  tenantIds.forEach((tenantId) => {
    it(
      `TC196314 - Get timers for ${Cypress.env('OKAPI_HOST')} - ${tenantId}`,
      { tags: ['fse', 'api', 'timers', 'eureka-sanity'] },
      () => {
        cy.log('ECS_TENANT_IDS: ' + Cypress.env('ECS_TENANT_IDS'));
        cy.log('ECS_TENANT_IDS length: ' + Cypress.env('ECS_TENANT_IDS').length);
        // Set the tenant ID for this iteration
        cy.setTenant(tenantId);

        cy.getTimers().then((response) => {
          cy.expect(response.status).to.eq(200);
          cy.log('Tenant ID: ' + tenantId);
          cy.log('total records: ' + response.body.totalRecords);
          cy.log('timers expected number:' + Cypress.env('TIMERS_NUMBER'));
          cy.expect(response.body.totalRecords).to.be.at.least(
            Number(Cypress.env('TIMERS_NUMBER')),
          );
          // Check that each timer descriptor has enabled = true
          response.body.timerDescriptors.forEach((timer) => {
            cy.wrap(timer.enabled).should('be.true');
          });
        });

        // Reset tenant to default after test
        cy.resetTenant();
      },
    );
  });
});
