import uuid from 'uuid';
import { getTestEntityValue } from '../../utils/stringTools';

export const defaultLoanPolicy = {
  id: uuid(),
  name: getTestEntityValue(),
  description: 'description',
  loanable: false,
  renewable: false,
};

export default {
  createApi() {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'loan-policy-storage/loan-policies',
        body: defaultLoanPolicy,
      })
      .then(({ body }) => {
        Cypress.env('loanPolicy', body);
        return body;
      });
  },
  deleteApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `loan-policy-storage/loan-policies/${id}`,
    });
  },
};
