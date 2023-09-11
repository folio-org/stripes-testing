Cypress.Commands.add('getLoanHistory', (loanId) => {
  return cy
    .okapiRequest({
      method: 'GET',
      path: 'loan-storage/loan-history',
      searchParams: {
        query: `loan.id==${loanId}`,
      },
    })
    .then(({ body }) => body.loansHistory);
});
