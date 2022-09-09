import uuid from 'uuid';
import { getTestEntityValue } from '../../utils/stringTools';

export const defaultRequestPolicy = {
  requestTypes: [
    'Hold',
  ],
  name: getTestEntityValue(),
  description: 'description',
  id: uuid(),
};

export default {
  createViaApi(requestPolicyBody = defaultRequestPolicy) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'request-policy-storage/request-policies',
        body: requestPolicyBody,
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
