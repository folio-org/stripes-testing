import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('fse-inventory', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195317 - Get instances by status for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['sanity', 'fse', 'api', 'inventory', 'loc', 'TC195317'] },
    () => {
      cy.getInventoryInstanceByStatus('Available').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `TC196250 - Check mod-inventory API for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['sanity', 'fse', 'api', 'inventory', 'TC196250'] },
    () => {
      InventoryInstances.getInstanceIdApi({
        limit: 1,
        query: 'title=*',
      }).then((instanceId) => cy.getInventoryInstanceById(instanceId).then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body.id).to.eq(instanceId);
      }));
    },
  );

  it(
    `FDOPS-6486 - Inventory item records carry the new order property for ${Cypress.config('baseUrl')} - ${Cypress.env('OKAPI_TENANT')}`,
    { tags: ['fse', 'api', 'sanity', 'inventory', 'trillium', 'FDOPS-6486'] },
    () => {
      cy.okapiRequest({
        path: 'item-storage/items',
        searchParams: {
          limit: 10,
          query: 'cql.allRecords=1',
        },
        isDefaultSearchParamsRequired: false,
      }).then((response) => {
        cy.expect(response.status).to.eq(200);
        cy.expect(response.body.items).to.be.an('array').with.length.greaterThan(0);
        response.body.items.forEach((item) => {
          cy.expect(item).to.have.property('order').that.is.a('number');
        });
      });
    },
  );
});
