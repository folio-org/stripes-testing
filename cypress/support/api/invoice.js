Cypress.Commands.add('getInvoiceIdApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'invoice/invoices',
      searchParams,
    })
    .then(response => response.body.invoices.at(-1).id);
});

Cypress.Commands.add('deleteInvoiceFromStorageApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `invoice/invoices/${id}`,
  });
});
