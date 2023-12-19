import { including } from '@interactors/html';

import { Modal, TextArea, Button, Callout } from '../../../../interactors';

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

  cancelFeeFineViaApi: (apiBody, feeFineId) => cy.okapiRequest({
    method: 'POST',
    path: `accounts/${feeFineId}/cancel`,
    body: apiBody,
    isDefaultSearchParamsRequired: false,
  }),
};
