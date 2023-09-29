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
};
