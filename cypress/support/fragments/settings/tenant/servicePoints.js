export default {
  getServicePointsApi: (searchParams) => {
    cy.okapiRequest({
      path: 'service-points',
      searchParams,
    })
      .then(({ body }) => {
        //   TO DO Убрать cy env
        Cypress.env('servicePoints', body.servicepoints);
        return body.servicepoints;
      });
  },

  createViaApi: (servicePointParameters) => cy.createServicePoint(servicePointParameters),
};
