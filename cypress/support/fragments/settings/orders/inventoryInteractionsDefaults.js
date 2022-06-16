export default {
  setConfigurationInventoryInteractions: (body) => {
    cy.okapiRequest({
      method: 'PUT',
      path: `configurations/entries/${body.id}`,
      body,
    });
  },

  getConfigurationInventoryInteractions: (searchParams) => {
    cy.okapiRequest({
      path: 'configurations/entries',
      searchParams
    }).then(response => { return response.body; });
  }
};


