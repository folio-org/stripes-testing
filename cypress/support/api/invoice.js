Cypress.Commands.add('getInvoiceApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'invoice/invoices',
      searchParams,
    });
});

Cypress.Commands.add('deleteInvoiceFromStorageApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `invoice/invoices/${id}`,
  });
});
