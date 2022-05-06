export default {
  getViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'service-points',
        searchParams,
      })
      .then(({ body }) => {
        Cypress.env('servicePoints', body.servicepoints);
        return body.servicepoints;
      });
  },
};
