import { including } from '@interactors/html';
import { Button, Modal } from '../../../../../interactors';

const confirmShareToAllModal = Modal({ id: 'share-controlled-vocab-entry-confirmation' });
const keepEditingButton = confirmShareToAllModal.find(Button('Keep editing'));
const confirmButton = confirmShareToAllModal.find(Button('Confirm'));

export default {
  waitLoadingConfirmShareToAll(name) {
    cy.expect([
      confirmShareToAllModal.has({
        header: 'Confirm share to all',
        content: including(`Are you sure you want to share ${name} with ALL members?`),
      }),
      keepEditingButton.is({ disabled: false }),
      confirmButton.is({ disabled: false }),
    ]);
  },

  waitLoadingConfirmShareToMemberLibraries(name) {
    cy.expect([
      Modal({ id: 'create-controlled-vocab-entry-confirmation' }).has({
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
