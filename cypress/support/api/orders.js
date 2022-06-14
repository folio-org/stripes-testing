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

Cypress.Commands.add('getAcquisitionMethodsApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'orders/acquisition-methods',
      searchParams
    });
});
