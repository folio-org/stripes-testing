export default {
  createViaApi() {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'instance-statuses',
        body: { source: 'local', name: 'Electronic Resource', code: 'elRes' },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
};
