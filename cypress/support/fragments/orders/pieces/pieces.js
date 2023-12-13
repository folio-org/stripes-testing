export default {
  getOrderPiecesViaApi(searchParams) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'orders/pieces',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
  },
  createOrderPieceViaApi(orderPiece) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'orders/pieces',
        body: orderPiece,
      })
      .then(({ body }) => body);
  },
};
