Cypress.Commands.add('createFeesFinesApi', (feesFines) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'accounts',
    body: feesFines,
  }).then(({ body }) => {
    Cypress.env('feesFines', body);
  });
});

Cypress.Commands.add('deleteFeesFinesApi', (feesFinesId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `accounts/${feesFinesId}`,
  });
});

Cypress.Commands.add('createFeesFinesTypeApi', (feesFinesType) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'feefines',
    body: feesFinesType,
  }).then(({ body }) => {
    Cypress.env('feesFinesType', body);
  });
});

Cypress.Commands.add('deleteFeesFinesTypeApi', (feesFinesTypeId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `feefines/${feesFinesTypeId}`,
  });
});
