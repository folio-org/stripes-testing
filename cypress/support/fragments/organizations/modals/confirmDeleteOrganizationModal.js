import { Button, Modal } from '../../../../../interactors';

const confirmDeleteItemModal = Modal({ id: 'delete-organization-confirmation' });
const cancelButton = confirmDeleteItemModal.find(Button('Cancel'));
const deleteButton = confirmDeleteItemModal.find(Button('Delete'));

export default {
  waitLoading() {
    cy.expect(confirmDeleteItemModal.exists());
  },

  isNotDisplayed() {
    cy.expect(confirmDeleteItemModal.absent());
  },

  verifyModalView(organizationName) {
    cy.expect(confirmDeleteItemModal.has({ header: `Delete ${organizationName}?` }));
    cy.expect(confirmDeleteItemModal.has({ message: 'Delete organization?' }));
    cy.expect(cancelButton.exists());
    cy.expect(deleteButton.exists());
  },

  clickCancel() {
    cy.do(cancelButton.click());
  },

  clickDeleteButton() {
    cy.do(deleteButton.click());
  },
};
