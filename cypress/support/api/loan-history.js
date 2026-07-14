Cypress.Commands.add(
  'getLoanHistory',
  (loanId, { searchParams, includeResponse = false, failOnStatusCode = true } = {}) => {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'loan-storage/loan-history',
        searchParams: {
          query: `loan.id==${loanId}`,
          ...searchParams,
        },
        // The isDefaultSearchParamsRequired flag must be false to avoid appending the default query=cql.allRecords=1
        // alongside an explicit query, which produces duplicate query params in the URL, causing intermittent server timeouts.
        // When the server processes cql.allRecords=1 as the active query, it returns all loan history
        // records — potentially thousands — which causes the 60s timeout.
        isDefaultSearchParamsRequired: false,
        failOnStatusCode,
      })
      .then((response) => {
        if (includeResponse) {
          return {
            ...response,
            loansHistory: response.body?.loansHistory,
          };
        }

        return response.body.loansHistory;
      });
  },
);
