import { Link } from '../../../interactors';

describe('Check Out', () => {
  let ITEM_BARCODE;

  before(() => {
    cy.visit('/');

    cy.login('diku_admin', 'admin');
  });

  beforeEach(() => {
    ITEM_BARCODE = Number(new Date()).toString();

    cy.getToken('diku_admin', 'admin')
      .then(() => {
        cy.getLoanTypes({ limit: 1 });
        cy.getMaterialTypes({ limit: 1 });
        cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        cy.getHoldingSources({ limit: 1 });
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
            sourceId: Cypress.env('holdingSources')[0].id,
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

  after(() => {
    cy.logout();
  });

  it('Basic flow', function () {
    cy.do(Link('Check out').click());

    cy.checkOutItem(Cypress.env('users')[0].barcode, ITEM_BARCODE);

    cy.verifyItemCheckOut();
  });
});
