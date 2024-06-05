Cypress.Commands.add('getReceivingTitlesByOrderStatus', (status) => {
  const UpdatedUrl = encodeURI(
    `orders/titles?query=purchaseOrder.workflowStatus=${status}&limit=1&offset=0`,
  );
  cy.okapiRequest({
    method: 'GET',
    path: UpdatedUrl,
    isDefaultSearchParamsRequired: false,
  });
});
