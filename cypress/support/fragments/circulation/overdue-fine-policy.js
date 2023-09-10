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
  createViaApi(body = defaultOverdueFinePolicy) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'overdue-fines-policies',
        body,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ responseBody }) => {
        Cypress.env('overdueFinePolicy', responseBody);
        return responseBody;
      });
  },
  deleteViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `overdue-fines-policies/${id}`,
    });
  },
};
