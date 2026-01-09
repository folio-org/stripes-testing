import { including } from '@interactors/html';

import { Modal, TextArea, Button, Callout, HTML } from '../../../../interactors';

const rootModal = Modal({ id: 'error-modal' });

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },

  fillInAdditionalInformationAndConfirm: (comment) => {
    cy.do([
      rootModal.find(TextArea({ name: 'comment' })).fillIn(comment),
      rootModal.find(Button('Confirm')).click(),
    ]);
    cy.expect(Callout(including('has been successfully cancelled as error for ')).exists());
  },

  confirmCancellation: (comment) => {
    cy.do([
      rootModal.find(TextArea({ name: 'comment' })).fillIn(comment),
      rootModal.find(Button('Confirm')).click(),
    ]);
    cy.wait(1000);
  },

  verifyCommentError: () => {
    cy.do(rootModal.find(TextArea({ name: 'comment' })).fillIn(''));
    cy.expect(rootModal.find(Button('Confirm')).has({ disabled: true }));
    cy.expect(rootModal.find(HTML(including('Comment must be provided'))).exists());
  },

  cancelFeeFineViaApi: (apiBody, feeFineId) => cy.okapiRequest({
    method: 'POST',
    path: `accounts/${feeFineId}/cancel`,
    body: apiBody,
    isDefaultSearchParamsRequired: false,
  }),

  verifyModalContent: (amount, feeFineType) => {
    cy.expect(rootModal.has({ header: 'Confirm fee/fine cancellation' }));
    cy.expect(rootModal.find(HTML(including(amount))).exists());
    cy.expect(rootModal.find(HTML(including(feeFineType))).exists());
  },

  clickBack: () => {
    cy.do(rootModal.find(Button('Back')).click());
  },
};
