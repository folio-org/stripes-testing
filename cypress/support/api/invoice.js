Cypress.Commands.add('getInvoiceIdViaApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'invoice/invoices',
      searchParams,
    })
    .then(response => response.body.invoices.at(-1).id);
});

Cypress.Commands.add('deleteInvoiceFromStorageViaApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `invoice/invoices/${id}`,
  });
});
