import { including } from '@interactors/html';
import { Button, ListItem, Modal } from '../../../../../interactors';

const confirmShareToAllModal = Modal({ id: 'create-controlled-vocab-entry-confirmation' });
const keepEditingButton = confirmShareToAllModal.find(Button('Keep editing'));
const confirmButton = confirmShareToAllModal.find(Button('Confirm'));

export default {
  waitLoadingConfirmCreate(name, members = []) {
    cy.expect([
      confirmShareToAllModal.has({
        header: 'Confirm member libraries',
        content: including(`${name} will be saved for the member libraries`),
      }),
      keepEditingButton.is({ disabled: false }),
      confirmButton.is({ disabled: false }),
    ]);
    if (members.length) this.verifyMemberLibrariesList(members);
  },

  verifyMemberLibrariesList(members) {
    const sortedMembers = [...members].sort((a, b) => a.localeCompare(b));
    sortedMembers.forEach((member, index) => {
      cy.expect(confirmCreateToAllModal.find(ListItem({ index, text: member })).exists());
    });
    cy.expect(confirmCreateToAllModal.find(ListItem({ index: sortedMembers.length })).absent());
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
