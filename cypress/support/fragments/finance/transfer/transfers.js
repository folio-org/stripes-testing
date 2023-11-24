import uuid from 'uuid';

export default {
  getDefaultTransfer({ amount, toFundId, fromFundId, fiscalYearId }) {
    return {
      amount,
      toFundId,
      fromFundId,
      fiscalYearId,
      currency: 'USD',
      transactionType: 'Transfer',
      source: 'User',
      id: uuid(),
    };
  },
  getTransfersViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'finance/transfers',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },
  createTransferViaApi(transfer) {
    return cy
      .okapiRequest({
        path: 'finance/transfers',
        body: transfer,
        method: 'POST',
      })
      .then((response) => {
        return response.body;
      });
  },
  deleteTransferViaApi(transferId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `finance/transfers/${transferId}`,
    });
  },
};
