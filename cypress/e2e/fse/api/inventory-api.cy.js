import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('fse-inventory', { retries: { runMode: 1 } }, () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.allure().logCommandSteps();
  });

  it(
    `TC195317 - Get instances by status for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'inventory', 'loc'] },
    () => {
      cy.getInventoryInstanceByStatus('Available').then((response) => {
        cy.expect(response.status).to.eq(200);
      });
    },
  );

  it(
    `TC196250 - Check mod-inventory API for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'api', 'inventory'] },
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
});
