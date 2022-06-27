export default {
  getViaApi: (searchParams) => cy.okapiRequest({
    path: 'service-points',
    searchParams,
  }).then(({ body }) => body.servicepoints),

  createViaApi : (servicePointParameters) => cy.okapiRequest({
    path: 'service-points',
    body: servicePointParameters,
    method: 'POST',
    isDefaultSearchParamsRequired: false
  }),
};
