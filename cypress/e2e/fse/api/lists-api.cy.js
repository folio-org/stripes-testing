import { Lists } from '../../../support/fragments/lists/lists';

const TRILLIUM_ENTITY_TYPE_NAMES = [
  'Authority',
  'Instances with MARC bibliographic',
  'Fee/Fine accounts with users',
  'Users with fees/fines, loans',
  'Users with manual blocks',
  'Users with open transactions',
  'Lost items requiring actual cost',
  'Order — Invoice Analysis',
  'Receiving pieces',
  'Receiving titles',
];

describe('fse-lists', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the allure report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195523 - Get lists for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['sanity', 'fse', 'api', 'lists', 'loc', 'fast-check', 'TC195523'] },
    () => {
      cy.getLists().then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `FDOPS-6488 - New Lists / FQM record types are installed for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'sanity', 'lists', 'trillium', 'FDOPS-6488'] },
    () => {
      Lists.getAllEntityTypesViaApi().then((response) => {
        cy.expect(response.status).to.eq(200);
        const entityTypeLabels = response.body.entityTypes.map((entityType) => entityType.label);
        TRILLIUM_ENTITY_TYPE_NAMES.forEach((name) => {
          cy.expect(entityTypeLabels, `"${name}" record type is present`).to.include(name);
        });
      });
    },
  );
});
