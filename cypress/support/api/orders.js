Cypress.Commands.add('createOrderApi', (order) => {
  return cy.okapiRequest({
    method: 'POST',
    path: 'orders/composite-orders',
    body: order,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('createOrderLineApi', (orderLine) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'orders/order-lines',
    body: orderLine,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getAcquisitionMethodsApi', (searchParams) => {
  return cy.okapiRequest({
    path: 'orders/acquisition-methods',
    searchParams,
  });
});

Cypress.Commands.add('getOrderByWorkflowStatus', (status) => {
  const UpdatedUrl = encodeURI(`orders/composite-orders?query=(workflowStatus==${status})&limit=1`);
  return cy.okapiRequest({
    path: UpdatedUrl,
    isDefaultSearchParamsRequired: false,
  });
});
