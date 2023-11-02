import uuid from 'uuid';
import { getTestEntityValue } from '../../utils/stringTools';
import { REQUEST_TYPES } from '../../constants';

export const defaultRequestPolicy = {
  requestTypes: [REQUEST_TYPES.HOLD],
  name: getTestEntityValue(),
  description: 'description',
  id: uuid(),
};

export default {
  createViaApi(requestBody = defaultRequestPolicy) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'request-policy-storage/request-policies',
        body: requestBody,
      })
      .then(({ body }) => {
        Cypress.env('requestPolicy', body);
        return body;
      });
  },
  deleteViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `request-policy-storage/request-policies/${id}`,
    });
  },
};
