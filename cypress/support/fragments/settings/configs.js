export default {
  getConfigViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'configurations/entries',
        searchParams,
      })
      .then(({ body }) => body.configs);
  },
  createConfigViaApi(config) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'configurations/entries',
        body: config,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
  },
  updateConfigViaApi(config) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `configurations/entries/${config.id}`,
      body: config,
      isDefaultSearchParamsRequired: false,
    });
  },
  deleteConfigViaApi(config) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `configurations/entries/${config.id}`,
    });
  },
};
