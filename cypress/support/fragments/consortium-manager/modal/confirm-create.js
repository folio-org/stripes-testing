import { including } from '@interactors/html';
import { Button, Modal } from '../../../../../interactors';

const confirmCreateToAllModal = Modal({ id: 'create-controlled-vocab-entry-confirmation' });
const keepEditingButton = confirmCreateToAllModal.find(Button('Keep editing'));
const confirmButton = confirmCreateToAllModal.find(Button('Confirm'));

export default {
  waitLoadingConfirmCreate(name) {
    cy.expect([
      confirmCreateToAllModal.has({
        header: 'Confirm member libraries',
        content: including(`${name} will be saved for the member libraries`),
      }),
      keepEditingButton.is({ disabled: false }),
      confirmButton.is({ disabled: false }),
    ]);
  },

  clickConfirm() {
    cy.do(confirmButton.click());
    cy.expect(confirmCreateToAllModal.absent());
  },

  clickKeepEditing() {
    cy.do(keepEditingButton.click());
    cy.expect(confirmCreateToAllModal.absent());
  },
};
