import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';
import { Button, Modal } from '../../../../../interactors';

function openActions() { cy.do(Button('Actions').click()); }

export default {
  edit() {
    openActions();
    cy.do(Button('Edit').click());
  },

  editItemViaApi: (item) => {
    return cy.okapiRequest({
      method: 'PUT',
      path: `inventory/items/${item.id}`,
      body: item,
      isDefaultSearchParamsRequired: false,
    });
  },

  markAsMissing:() => {
    openActions();
    cy.do(Button('Mark as missing').click());
    cy.do(Modal('Confirm item status: Missing').find(Button('Confirm')).click());
  },

  markItemAsMissingByUserIdViaApi(userId) {
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
  },

  markAsWithdrawn:() => {
    openActions();
    cy.do([
      Button('Mark as withdrawn').click(),
      Modal('Confirm item status: Withdrawn').find(Button('Confirm')).click()
    ]);
  },

  markAsInProcess:() => {
    openActions();
    cy.do([
      Button('Mark as in process').click(),
      Modal('Confirm item status: In process').find(Button('Confirm')).click()
    ]);
  },

  markAsUnknown:() => {
    openActions();
    cy.do([
      Button('Mark as unknown').click(),
      Modal('Confirm item status: Unknown').find(Button('Confirm')).click()
    ]);
  },
};
