import { Button, MultiColumnListRow, Pane, TextField, including } from '../../../../../interactors';

const newButton = Button({ id: 'clickable-add-request-cancellation-reasons' });
const cancellationReasonTextField = TextField({ name: 'items[0].name' });
const saveButton = Button('Save');

export default {
  waitLoading() {
    cy.expect(Pane('Request cancellation reasons').exists());
    cy.wait(1000);
  },

  clickNewButton() {
    cy.do(newButton.click());
  },

  setCancellationReasonName(name) {
    cy.do(cancellationReasonTextField.fillIn(name));
  },

  saveCancellationReason() {
    cy.do(saveButton.click());
  },

  verifyErrorMessage(message) {
    cy.expect(MultiColumnListRow(including(message)).exists());
  },
};
