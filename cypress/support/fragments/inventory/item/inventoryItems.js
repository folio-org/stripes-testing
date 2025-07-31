import uuid from 'uuid';

import { Button, Modal, Pane } from '../../../../../interactors';
import { ITEM_STATUS_NAMES } from '../../../constants';
import getRandomPostfix from '../../../utils/stringTools';

const newRequestButton = Button('New request');

function openActions() {
  cy.wait(2000);
  cy.do(Button('Actions').click());
}
function clickMissingButton() {
  cy.do(Button('Missing').click());
}
function clickNewRequestButton() {
  cy.do(newRequestButton.click());
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
  openActions,
  clickNewRequestButton,
  edit() {
    cy.wait(3000);
    openActions();
    cy.do(Button('Edit').click());
    cy.wait(5000);
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

  updateItemStatusViaAPI(itemId, status) {
    cy.okapiRequest({
      method: 'POST',
      path: `inventory/items/${itemId}/${status}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  markAsWithdrawn: () => {
    openActions();
    cy.do([
      Button('Withdrawn').click(),
      Modal('Confirm item status: Withdrawn').find(Button('Confirm')).click(),
    ]);
  },

  markAsInProcess: (param = true) => {
    const buttonName = param ? 'In process (non-requestable)' : 'In process';
    openActions();
    cy.do([
      Button(buttonName).click(),
      Modal(`Confirm item status: ${buttonName}`).find(Button('Confirm')).click(),
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
    cy.wait(4000);
  },
  closeItemInHeader() {
    cy.do(Pane({ id: 'item-view-pane' }).dismiss());
  },
  getItemViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'inventory/items',
        searchParams,
      })
      .then(({ body }) => body.items);
  },
  createItemViaApi(item) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'inventory/items',
        body: item,
      })
      .then(({ body }) => body);
  },
  deleteItemViaApi(itemId, ignoreErrors = true) {
    cy.okapiRequest({
      method: 'DELETE',
      path: `inventory/items/${itemId}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: !ignoreErrors,
    });
  },
  addItemToHoldingViaApi({
    barcode = uuid(),
    status = ITEM_STATUS_NAMES.AVAILABLE,
    holdingsRecordId,
  }) {
    cy.then(() => {
      cy.getLoanTypes({ limit: 1 });
      cy.getMaterialTypes({ limit: 1 });
    }).then(() => {
      const item = {
        id: uuid(),
        barcode,
        status: { name: status },
        permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
        materialType: { id: Cypress.env('materialTypes')[0].id },
        holdingsRecordId,
      };
      this.createItemViaApi(item);
      cy.wrap(item).as('inventoryItem');
    });

    return cy.get('@inventoryItem');
  },
  verifyNewRequestButtonIsAbsent() {
    cy.expect(newRequestButton.absent());
  },
};
