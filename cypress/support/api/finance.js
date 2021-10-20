import uuid from 'uuid';

Cypress.Commands.add('getFundTypesApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'finance/fund-types',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('fundTypes', body.fundTypes);
    });
});

Cypress.Commands.add('getGroupsApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'finance/groups',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('groups', body.groups);
    });
});

Cypress.Commands.add('getLedgersApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'finance/ledgers',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('ledgers', body.ledgers);
    });
});

Cypress.Commands.add('createFundApi', ({ groupIds = [], ...fund }) => {
  const fundId = uuid();

  cy.okapiRequest({
    method: 'POST',
    path: 'finance/funds',
    body: {
      fund: {
        id: fundId,
        ...fund,
      },
      groupIds,
    },
  });
});

Cypress.Commands.add('deleteFundApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `finance/funds/${id}`,
  });
});
