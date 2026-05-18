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
  getVoucherLinesViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'voucher/voucher-lines',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
  },
  deleteVoucherViaApi(voucherId, { failOnStatusCode = false } = {}) {
    return cy
      .okapiRequest({
        method: 'DELETE',
        path: `voucher-storage/vouchers/${voucherId}`,
        failOnStatusCode,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
  },
  deleteVoucherLineViaApi(voucherLineId, { failOnStatusCode = false } = {}) {
    return cy
      .okapiRequest({
        method: 'DELETE',
        path: `voucher-storage/voucher-lines/${voucherLineId}`,
        failOnStatusCode,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
  },
};
