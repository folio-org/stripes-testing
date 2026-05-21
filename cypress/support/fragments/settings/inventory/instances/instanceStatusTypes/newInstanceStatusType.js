export default {
  createViaApi(name = 'Electronic Resource', code = 'elRes') {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'instance-statuses',
        body: { source: 'local', name, code },
        isDefaultSearchParamsRequired: false,
      })
      .then(({ response }) => {
        return response;
      });
  },
};
