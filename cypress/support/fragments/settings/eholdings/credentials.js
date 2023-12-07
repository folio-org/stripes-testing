export default {
  getCredentialsViaApi() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'eholdings/kb-credentials',
        contentTypeHeader: 'application/vnd.api+json',
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.data;
      });
  },
};
