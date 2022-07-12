import uuid from 'uuid';
import { getTestEntityValue } from '../../../utils/stringTools';

export const getNewRefundReason = (name, desc) => ({
  nameReason: name ? getTestEntityValue(name) : getTestEntityValue(),
  description: desc ? getTestEntityValue(desc) : getTestEntityValue(),
  id: uuid(),
});

export default {
  createViaApi: (refundReason) => cy.okapiRequest({ method: 'POST',
    path: 'refunds',
    body: refundReason,
    isDefaultSearchParamsRequired: false }),
  deleteViaApi:  (id) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `refunds/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
