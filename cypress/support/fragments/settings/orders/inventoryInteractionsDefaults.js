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
  createApprovalSettingViaApi(setting) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'configurations/entries',
        body: setting,
      })
      .then(({ body }) => body);
  },
};
