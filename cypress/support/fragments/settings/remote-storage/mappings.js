export default {
  createViaApi({ configurationId, folioLocationId }) {
    return cy
      .okapiRequest({
        path: 'remote-storage/mappings',
        body: { configurationId, folioLocationId },
        method: 'POST',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },
};
