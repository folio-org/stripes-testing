export default {
  // https://s3.amazonaws.com/foliodocs/api/mod-orders/r/pieces.html#orders_pieces_get
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

  // https://s3.amazonaws.com/foliodocs/api/mod-orders/r/pieces.html#orders_pieces_post
  createOrderPieceViaApi(orderPiece) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'orders/pieces',
        body: orderPiece,
      })
      .then(({ body }) => body);
  },

  // https://s3.amazonaws.com/foliodocs/api/mod-orders/r/pieces-batch.html#orders_pieces_batch_post
  upsertOrderPiecesBatchViaApi(pieces, { createItem } = {}) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'orders/pieces-batch',
        searchParams: { createItem },
        body: {
          pieces,
          totalRecords: pieces.length,
        },
      })
      .then(({ body }) => body);
  },

  // https://s3.amazonaws.com/foliodocs/api/mod-orders/r/pieces.html#orders_pieces__id__put
  updateOrderPieceViaApi(piece) {
    return cy
      .okapiRequest({
        method: 'PUT',
        path: `orders/pieces/${piece.id}`,
        body: piece,
      })
      .then(({ body }) => body);
  },

  // https://s3.amazonaws.com/foliodocs/api/mod-orders/r/pieces-batch.html#orders_pieces_batch_status_put
  updateOrderPiecesStatusesBatchViaApi(dto) {
    const {
      claimingInterval,
      externalNote,
      internalNote,
      pieceIds, // required
      receivingStatus, // required
    } = dto;

    return cy
      .okapiRequest({
        method: 'PUT',
        path: 'orders/pieces-batch/status',
        body: {
          claimingInterval,
          externalNote,
          internalNote,
          pieceIds,
          receivingStatus,
        },
      })
      .then(({ body }) => body);
  },

  // https://s3.amazonaws.com/foliodocs/api/mod-orders/r/pieces.html#orders_pieces__id__delete
  deleteOrderPieceViaApi(pieceId, { failOnStatusCode = false } = {}) {
    return cy
      .okapiRequest({
        method: 'DELETE',
        path: `orders/pieces/${pieceId}`,
        failOnStatusCode,
      })
      .then(({ body }) => body);
  },

  // https://s3.amazonaws.com/foliodocs/api/mod-orders/r/bind-pieces.html#orders_bind_pieces_post
  bindPiecesViaApi(dto) {
    const {
      bindItem, // required
      bindPieceIds, // required
      instanceId,
      poLineId, // required
      requestsAction,
      tenantId,
    } = dto;

    return cy
      .okapiRequest({
        method: 'POST',
        path: 'orders/bind-pieces',
        body: {
          bindItem,
          bindPieceIds,
          instanceId,
          poLineId,
          requestsAction,
          tenantId,
        },
      })
      .then(({ body }) => {
        /**
          {
            poLineId: string,
            boundPieceIds: string[],
            itemId: string,
          }
        */
        return body;
      });
  },

  // https://s3.amazonaws.com/foliodocs/api/mod-orders/r/bind-pieces.html#orders_bind_pieces__id__delete
  deleteBoundPieceViaApi(id, { failOnStatusCode = false } = {}) {
    return cy
      .okapiRequest({
        method: 'DELETE',
        path: `orders/bind-pieces/${id}`,
        failOnStatusCode,
      })
      .then(({ body }) => body);
  },
};
