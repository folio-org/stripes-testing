import { Button, Modal, Select, including } from '../../../../../interactors';

const selectLocationModal = Modal(including('Select'));
const cancelButton = selectLocationModal.find(Button('Cancel'));
const saveButton = selectLocationModal.find(Button('Save and close'));

export default {
  selectLocation(value) {
    cy.do([Select('Institution').choose(including(value)), saveButton.click()]);
    cy.expect(selectLocationModal.absent());
  },
  verifyModalView() {
    cy.expect([
      saveButton.has({ disabled: true, visible: true }),
      cancelButton.has({ disabled: false, visible: true }),
    ]);
  },
  closeModal() {
    return cy.do(cancelButton.click());
  },
};
