import generateItemBarcode from '../../support/utils/generateItemBarcode';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Check Out', () => {
  let ITEM_BARCODE;

  beforeEach(() => {
    ITEM_BARCODE = generateItemBarcode();
    let source;

    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getAdminToken()
      .then(() => {
        cy.getLoanTypes({ limit: 1 });
        cy.getMaterialTypes({ limit: 1 });
        cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        source = InventoryHoldings.getHoldingSources({ limit: 1 });
        cy.getInstanceTypes({ limit: 1 });
        cy.getUsers({ limit: 1, query: '"personal.firstName"="checkin-all" and "active"="true"' });
      })
      .then(() => {
        cy.getUserServicePoints(Cypress.env('users')[0].id);

        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: `Pre-checkout instance ${Number(new Date())}`,
          },
          holdings: [{
            holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
            permanentLocationId: Cypress.env('locations')[0].id,
            sourceId: source.id,
          }],
          items: [
            [{
              barcode: ITEM_BARCODE,
              missingPieces: '3',
              numberOfMissingPieces: '3',
              status: { name: 'Available' },
              permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
              materialType: { id: Cypress.env('materialTypes')[0].id },
            }],
          ],
        });
      });
  });

  it('Basic flow', function () {
    cy.visit('/checkout');

    cy.checkOutItem(Cypress.env('users')[0].barcode, ITEM_BARCODE);

    cy.verifyItemCheckOut();
  });
});
