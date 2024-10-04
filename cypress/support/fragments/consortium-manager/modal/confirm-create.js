import { including } from '@interactors/html';
import { Button, Modal } from '../../../../../interactors';

const confirmShareToAllModal = Modal({ id: 'create-controlled-vocab-entry-confirmation' });
const keepEditingButton = confirmShareToAllModal.find(Button('Keep editing'));
const confirmButton = confirmShareToAllModal.find(Button('Confirm'));

export default {
  waitLoadingConfirmCreate(name) {
    cy.expect([
      confirmShareToAllModal.has({
        header: 'Confirm member libraries',
        content: including(`${name} will be saved for the member libraries`),
      }),
      keepEditingButton.is({ disabled: false }),
      confirmButton.is({ disabled: false }),
    ]);
  },

  clickConfirm() {
    cy.do(confirmButton.click());
    cy.expect(confirmShareToAllModal.absent());
  },

  clickKeepEditing() {
    cy.do(keepEditingButton.click());
    cy.expect(confirmShareToAllModal.absent());
  },
};
