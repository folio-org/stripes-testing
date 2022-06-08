import generateItemBarcode from '../../support/utils/generateItemBarcode';
import checkoutActions from '../../support/fragments/checkout/checkout';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Check In', () => {
  const ITEM_BARCODE = generateItemBarcode();
  let source;

  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getAdminToken()
      .then(() => {
        cy.getLoanTypes({ limit: 1 });
        cy.getMaterialTypes({ limit: 1 });
        cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        source = InventoryHoldings.getHoldingSources({ limit: 1 });
        cy.getInstanceTypes({ limit: 1 });
        cy.getUsers({ limit: 1, query: '"personal.firstName"="checkout-all" and "active"="true"' });
      })
      .then(() => {
        cy.getUserServicePoints(Cypress.env('users')[0].id);

        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: `Checkout instance ${Number(new Date())}`,
          },
          holdings: [{
            holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
            permanentLocationId: Cypress.env('locations')[0].id,
            sourceId: source.id
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
      })
      .then(() => {
        checkoutActions.createItemCheckoutApi({
          itemBarcode: ITEM_BARCODE,
          userBarcode: Cypress.env('users')[0].barcode,
          servicePointId: Cypress.env('userServicePoints')[0].id,
        });
      });
  });

  it('Basic flow', function () {
    cy.visit('/checkin');

    cy.checkInItem(ITEM_BARCODE);
    cy.verifyItemCheckIn();
  });
});
