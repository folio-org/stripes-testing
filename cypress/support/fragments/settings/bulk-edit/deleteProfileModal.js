import { Modal, Button, HTML, including } from '../../../../../interactors';

const getModal = (recordType) => Modal(`Delete ${recordType} records bulk edit profile?`);
const cancelButton = Button('Cancel');
const deleteButton = Button('Delete');

export default {
  verifyModalElements(recordType, profileName) {
    const modal = getModal(recordType);

    cy.expect(modal.exists());
    cy.expect(modal.find(HTML(including(`Delete "${profileName}" profile?`))).exists());
    cy.expect(cancelButton.has({ disabled: false }));
    cy.expect(deleteButton.has({ disabled: false }));
  },

  verifyModalAbsent() {
    const modal = getModal();

    cy.expect(modal.absent());
  },

  clickCancelButton() {
    cy.do(cancelButton.click());
  },

  clickDeleteButton() {
    cy.do(deleteButton.click());
  },
};
