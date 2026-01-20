// Configuration: tenant ID suffixes from _0001 to _0063
let tenantSuffixes = [];
if (Cypress.env('OKAPI_HOST').toLowerCase().includes('mobius')) {
  tenantSuffixes = [
    '_0001',
    '_0002',
    '_0003',
    '_0004',
    '_0005',
    '_0006',
    '_0007',
    '_0008',
    '_0009',
    '_0010',
    '_0011',
    '_0012',
    '_0013',
    '_0014',
    '_0015',
    '_0016',
    '_0017',
    '_0018',
    '_0019',
    '_0020',
    '_0021',
    '_0022',
    '_0023',
    '_0024',
    '_0025',
    '_0026',
    '_0027',
    '_0028',
    '_0029',
    '_0030',
    '_0031',
    '_0032',
    '_0033',
    '_0034',
    '_0035',
    '_0036',
    '_0037',
    '_0039',
    '_0040',
    '_0041',
    '_0042',
    '_0043',
    '_0044',
    '_0045',
    '_0046',
    '_0047',
    '_0048',
    '_0049',
    '_0050',
    '_0051',
    '_0052',
    '_0053',
    '_0054',
    '_0055',
    '_0056',
    '_0057',
    '_0058',
    '_0059',
    '_0060',
    '_0061',
    '_0062',
    '_0063',
    '',
  ];
} else {
  tenantSuffixes = [''];
}

describe('fse-timers', () => {
  // Get token once for all tests
  before(() => {
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  // Run test for each tenant ID suffix
  tenantSuffixes.forEach((suffix) => {
    const baseTenantId = Cypress.env('OKAPI_TENANT');
    const fullTenantId = `${baseTenantId}${suffix}`;

    it(
      `TC196314 - Get timers for ${Cypress.env('OKAPI_HOST')} - ${fullTenantId}`,
      { tags: ['fse', 'api', 'timers', 'eureka-sanity'] },
      () => {
        // Set the tenant ID for this iteration
        cy.setTenant(fullTenantId);

        cy.getTimers().then((response) => {
          cy.expect(response.status).to.eq(200);
          cy.log('Tenant ID: ' + fullTenantId);
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
