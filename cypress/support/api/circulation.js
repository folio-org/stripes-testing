import uuid from 'uuid';

Cypress.Commands.add('createItemCheckout', (checkout) => {
  const checkoutId = uuid();

  cy.okapiRequest({
    method: 'POST',
    path: 'circulation/check-out-by-barcode',
    body: {
      id: checkoutId,
      ...checkout,
    }
  });
});
