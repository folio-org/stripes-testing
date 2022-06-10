Cypress.Commands.add('createOrderApi', (order) => {
  return cy
    .okapiRequest({
      method: 'POST',
      path: 'orders/composite-orders',
      body: order
    });
});

Cypress.Commands.add('createOrderLineApi', (orderLine) => {
  cy
    .okapiRequest({
      method: 'POST',
      path: 'orders/order-lines',
      body: orderLine,
    });
});

Cypress.Commands.add('getOrdersApi', (searchParams) => {
  cy.okapiRequest({
    path: 'orders/composite-orders',
    searchParams
  }).then(response => { return response.body.orders[0]; });
});

Cypress.Commands.add('getAcquisitionMethodsApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'orders/acquisition-methods',
      searchParams
    });
});

Cypress.Commands.add('deleteOrderApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `orders/composite-orders/${id}`,
  });
});
