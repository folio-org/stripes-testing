export default {
  getVouchersViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'voucher/vouchers',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
  },
  updateVouchersViaApi(voucher) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `voucher/vouchers/${voucher.id}`,
      body: voucher,
    });
  },
};
