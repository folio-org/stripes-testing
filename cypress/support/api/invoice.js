Cypress.Commands.add('getInvoiceIdApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'invoice/invoices',
      searchParams,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => response.body.invoices.at(-1).id);
});

Cypress.Commands.add('deleteInvoiceFromStorageViaApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `invoice/invoices/${id}`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getInvoiceByStatus', (status) => {
  const UpdatedUrl = encodeURI(`invoice/invoices?query=status==${status}&limit=1`);
  cy.okapiRequest({
    path: UpdatedUrl,
    isDefaultSearchParamsRequired: false,
  });
});
