import { Modal, Button, HTML, including } from '../../../../../interactors';

const areYouSureModal = Modal('Are you sure?');
const keepEditingButton = areYouSureModal.find(Button('Keep editing'));
const closeWithoutSavingButton = areYouSureModal.find(Button('Close without saving'));

export default {
  verifyModalElements(message) {
    cy.expect(areYouSureModal.exists());
    cy.expect(areYouSureModal.find(HTML(including(message))).exists());
    cy.expect(keepEditingButton.has({ disabled: false }));
    cy.expect(closeWithoutSavingButton.has({ disabled: false }));
  },

  clickKeepEditing() {
    cy.do(keepEditingButton.click());
  },

  clickCloseWithoutSaving() {
    cy.do(closeWithoutSavingButton.click());
  },
};
