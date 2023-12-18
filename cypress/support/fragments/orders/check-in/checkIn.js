import uuid from 'uuid';

export default {
  getDefaultCheckInConfig({ poLineId, orderPieceId, locationId, holdingId, barcode = uuid() }) {
    return {
      toBeCheckedIn: [
        {
          poLineId,
          checkedIn: 1,
          checkInPieces: [
            {
              id: orderPieceId,
              barcode,
              displayOnHolding: false,
              locationId,
              holdingId,
              itemStatus: 'In process',
            },
          ],
        },
      ],
      totalRecords: 1,
    };
  },
  getOrderCheckInViaApi(searchParams) {
    return cy.okapiRequest({
      method: 'GET',
      path: 'orders/check-in',
      searchParams,
      isDefaultSearchParamsRequired: false,
    });
  },
  createOrderCheckInViaApi(checkIn) {
    return cy.okapiRequest({
      method: 'POST',
      path: 'orders/check-in',
      body: checkIn,
    });
  },
};
