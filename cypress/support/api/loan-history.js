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
