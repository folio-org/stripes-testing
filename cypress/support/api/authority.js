Cypress.Commands.add('getAuthorityHeadingsUpdatesViaAPI', (startDate, endDate, limit = '100') => {
  cy.okapiRequest({
    method: 'GET',
    path: 'links/stats/authority',
    searchParams: {
      action: 'UPDATE_HEADING',
      fromDate: `${startDate}T00:00:00.000Z`,
      toDate: `${endDate}T23:59:59.000Z`,
      limit,
    },
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.stats;
  });
});
