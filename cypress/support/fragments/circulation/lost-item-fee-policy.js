import uuid from 'uuid';
import { getTestEntityValue } from '../../utils/stringTools';

export const defaultLostItemFeePolicy = {
  chargeAmountItem: {
    amount: '0.00',
    chargeType: 'anotherCost',
  },
  lostItemProcessingFee: '0.00',
  chargeAmountItemPatron: false,
  chargeAmountItemSystem: false,
  returnedLostItemProcessingFee: false,
  replacedLostItemProcessingFee: false,
  replacementProcessingFee: '0.00',
  replacementAllowed: false,
  lostItemReturned: 'Charge',
  name: getTestEntityValue(),
  description: 'description',
  lostItemChargeFeeFine: {
    duration: 1,
    intervalId: 'Days',
  },
  id: uuid(),
};

export default {
  createApi() {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'lost-item-fees-policies',
        body: defaultLostItemFeePolicy,
      })
      .then(({ body }) => {
        Cypress.env('lostItemFeePolicy', body);
        return body;
      });
  },
  deleteApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `lost-item-fees-policies/${id}`,
    });
  },
};
