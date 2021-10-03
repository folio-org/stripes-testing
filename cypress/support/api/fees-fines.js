Cypress.Commands.add('postFeesFines', (feesFines) => {
  cy
    .okapiRequest({
      method: 'POST',
      path: 'accounts',
      body: feesFines,
    })
    .then(({ body }) => {
      Cypress.env('feesFines', body);
    });
});

Cypress.Commands.add('deleteFeesFines', (feesFinesId) => {
  cy
    .okapiRequest({
      method: 'DELETE',
      path: `accounts/${feesFinesId}`,
    });
});

Cypress.Commands.add('postFeesFinesType', (feesFinesType) => {
  cy
    .okapiRequest({
      method: 'POST',
      path: 'feefines',
      body: feesFinesType,
    })
    .then(({ body }) => {
      Cypress.env('feesFinesType', body);
    });
});

Cypress.Commands.add('deleteFeesFinesType', (feesFinesTypeId) => {
  cy
    .okapiRequest({
      method: 'DELETE',
      path: `feefines/${feesFinesTypeId}`,
    });
});
