export default {
  getAddressesViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'tenant-addresses',
        searchParams,
      })
      .then(({ body }) => body.addresses);
  },
  createAddressViaApi(config) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'tenant-addresses',
        body: config,
      })
      .then(({ body }) => body);
  },
  updateAddressViaApi(config) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `tenant-addresses/${config.id}`,
      body: config,
    });
  },
  deleteAddressViaApi(config) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `tenant-addresses/${config.id}`,
    });
  },
};
