import HoldingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';

describe('test describe', () => {
  const instanceTitle = `autoTestInstanceTitle.${getRandomPostfix()}`;

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
      .then(() => {
        cy.getInstanceTypes({ limit: 1 });
        cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        cy.getHoldingSources({ limit: 1 });
      })
      .then(() => {
        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: instanceTitle,
            source: 'FOLIO',
          },
          holdings: [{
            holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
            permanentLocationId: Cypress.env('locations')[0].id,
            sourceId: Cypress.env('holdingSources')[0].id,
          }],
        });
      });
  });

  it('test it', () => {
    cy.visit(TopMenu.inventoryPath);
    cy.log(`---LOCATIONS--- ${JSON.stringify(Cypress.env('locations')[0])}`);
    InventorySearch.searchByParameter('Keyword (title, contributor, identifier)', instanceTitle);
    InventorySearch.selectSearchResultItem();
    InventoryInstance.goToHoldingView();
    HoldingsRecordView.edit();
    cy.log('----Success!----');
  });
});
