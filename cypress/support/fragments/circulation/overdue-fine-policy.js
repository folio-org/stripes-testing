import uuid from 'uuid';
import { getTestEntityValue } from '../../utils/stringTools';

export const defaultOverdueFinePolicy = {
  countClosed: true,
  forgiveOverdueFine: true,
  gracePeriodRecall: true,
  maxOverdueFine: '0.00',
  maxOverdueRecallFine: '0.00',
  name: getTestEntityValue(),
  description: 'description',
  id: uuid(),
};

export default {
  createApi() {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'overdue-fines-policies',
        body: defaultOverdueFinePolicy,
      })
      .then(({ body }) => {
        Cypress.env('overdueFinesPolicies', body);
        return body;
      });
  },
  deleteApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `overdue-fines-policies/${id}`,
    });
  },
};
