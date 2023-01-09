import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';

export default {
  markItemAsMissingByUserId(userId) {
    return cy.okapiRequest({
      path: 'circulation/loans',
      searchParams: {
        query: `(userId==${userId})`,
      },
      isDefaultSearchParamsRequired: false
    }).then(response => {
      const loanId = response.body.loans[0].id;

      cy.okapiRequest({
        method: 'POST',
        path: `circulation/loans/${loanId}/declare-claimed-returned-item-as-missing`,
        body: {
          id: uuid(),
          comment: getRandomPostfix()
        },
        isDefaultSearchParamsRequired: false
      });
    });
  }
};
