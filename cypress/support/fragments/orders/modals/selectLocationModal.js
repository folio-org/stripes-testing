import { Button, Modal, Select, including } from '../../../../../interactors';

const selectLocationModal = Modal(including('Select'));
const cancelButton = selectLocationModal.find(Button('Cancel'));
const saveAndCloseButton = selectLocationModal.find(Button('Save and close'));

export default {
  waitLoading() {
    cy.expect(selectLocationModal.exists());
  },
  verifyModalView() {
    cy.expect([
      saveAndCloseButton.has({ disabled: true, visible: true }),
      cancelButton.has({ disabled: false, visible: true }),
    ]);
  },
  selectLocation(value) {
    cy.do([Select('Institution').choose(including(value))]);
  },
  closeModal() {
    return cy.do(cancelButton.click());
  },
  clickSaveButton() {
    cy.expect(saveAndCloseButton.has({ disabled: false }));
    cy.do(saveAndCloseButton.click());

    cy.expect(selectLocationModal.absent());
  },
};
