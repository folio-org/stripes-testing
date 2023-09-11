import uuid from 'uuid';

Cypress.Commands.add('getFundTypesApi', (searchParams) => {
  return cy.okapiRequest({
    path: 'finance/fund-types',
    searchParams,
  });
});

Cypress.Commands.add('getGroupsApi', (searchParams) => {
  return cy.okapiRequest({
    path: 'finance/groups',
    searchParams,
  });
});

Cypress.Commands.add('getLedgersApi', (searchParams) => {
  return cy.okapiRequest({
    path: 'finance/ledgers',
    searchParams,
  });
});

Cypress.Commands.add('getFiscalYearsApi', (searchParams) => {
  return cy.okapiRequest({
    path: 'finance/fiscal-years',
    searchParams,
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

Cypress.Commands.add('createLedgerApi', (ledger) => {
  const ledgerId = uuid();

  cy.okapiRequest({
    method: 'POST',
    path: 'finance/ledgers',
    body: {
      id: ledgerId,
      ...ledger,
    },
  });
});

Cypress.Commands.add('deleteLedgerApi', (id) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `finance/ledgers/${id}`,
  });
});

Cypress.Commands.add('getFundsApi', (searchParams) => {
  cy.okapiRequest({
    path: 'finance/funds',
    searchParams,
  }).then((response) => {
    return response.body.funds;
  });
});
