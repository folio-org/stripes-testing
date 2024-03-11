export default {
  createTransactionViaApi(dcbTransactionId, payload) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: `transactions/${dcbTransactionId}`,
        body: payload,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },

  getTransactionViaApi(dcbTransactionId) {
    return cy
      .okapiRequest({
        path: `transactions/${dcbTransactionId}/status`,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },

  updateTransactionViaApi(dcbTransactionId, payload) {
    return cy
      .okapiRequest({
        method: 'PUT',
        path: `transactions/${dcbTransactionId}/status`,
        body: payload,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },
};
