import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';
import { Button, Modal } from '../../../../../interactors';

function openActions() {
  cy.do(Button('Actions').click());
}
function clickMissingButton() {
  cy.do(Button('Missing').click());
}
function confirmMarkAsMissing() {
  cy.do(Modal('Confirm item status: Missing').find(Button('Confirm')).click());
}
function cancelMarkAsMissing() {
  cy.do(Modal('Confirm item status: Missing').find(Button('Cancel')).click());
}

export default {
  confirmMarkAsMissing,
  cancelMarkAsMissing,
  edit() {
    cy.wait(5000);
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

  markAsMissing: () => {
    openActions();
    clickMissingButton();
  },

  markItemAsMissingByUserIdViaApi(userId) {
    return cy
      .okapiRequest({
        path: 'circulation/loans',
        searchParams: {
          query: `(userId==${userId})`,
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        const loanId = response.body.loans[0].id;

        cy.okapiRequest({
          method: 'POST',
          path: `circulation/loans/${loanId}/declare-claimed-returned-item-as-missing`,
          body: {
            id: uuid(),
            comment: getRandomPostfix(),
          },
          isDefaultSearchParamsRequired: false,
        });
      });
  },

  markAsWithdrawn: () => {
    openActions();
    cy.do([
      Button('Withdrawn').click(),
      Modal('Confirm item status: Withdrawn').find(Button('Confirm')).click(),
    ]);
  },

  markAsInProcess: () => {
    openActions();
    cy.do([
      Button('In process (non-requestable)').click(),
      Modal('Confirm item status: In process (non-requestable)').find(Button('Confirm')).click(),
    ]);
  },

  markAsUnknown: () => {
    openActions();
    cy.do([
      Button('Unknown').click(),
      Modal('Confirm item status: Unknown').find(Button('Confirm')).click(),
    ]);
  },

  closeItem() {
    cy.do(Button({ icon: 'times' }).click());
  },

  getItemViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'inventory/items',
        searchParams,
      })
      .then(({ body }) => body.items);
  },
  deleteItemViaApi(itemId) {
    cy.okapiRequest({
      method: 'DELETE',
      path: `inventory/items/${itemId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
