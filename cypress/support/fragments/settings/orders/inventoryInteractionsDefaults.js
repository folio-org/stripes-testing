export default {
  setConfigurationInventoryInteractions: (body) => {
    cy.okapiRequest({
      method: 'PUT',
      path: `configurations/entries/${body.id}`,
      body,
      isDefaultSearchParamsRequired: false,
    });
  },

  getConfigurationInventoryInteractions: (searchParams) => {
    return cy
      .okapiRequest({
        path: 'configurations/entries',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },
};
