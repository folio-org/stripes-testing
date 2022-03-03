Cypress.Commands.add('getInvoiceIdApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'invoice/invoices',
      searchParams,
    })
    .then(responce => {
      cy.log(JSON.stringify(responce));
      cy.pause();
      return responce.body.invoices.at(-1).id;
    });
});

Cypress.Commands.add('deleteInvoiceFromStorageApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `invoice/invoices/${id}`,
  });
});
