import { getTestEntityValue } from '../../../utils/stringTools';

export default {
  getDefaultNewRefundReason: (id, name, desc) => ({
    nameReason: getTestEntityValue(name),
    description: getTestEntityValue(desc),
    id,
  }),
  createViaApi: (refundReason) => cy.okapiRequest({
    method: 'POST',
    path: 'refunds',
    body: refundReason,
    isDefaultSearchParamsRequired: false,
  }),
  deleteViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `refunds/${id}`,
    isDefaultSearchParamsRequired: false,
  }),
};
