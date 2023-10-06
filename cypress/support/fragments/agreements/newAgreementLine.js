import { TextField } from '@interactors/html';
import { Button, Pane, TextArea } from '../../../../interactors';

const newAgreementLinePane = Pane({ id: 'pane-agreement-line-form' });
const descriptionTextArea = TextArea({ label: 'Description' });
const noteTextArea = TextArea({ label: 'Note' });
const saveButton = Button('Save & close');

const calloutMessages = {
  ALERT_MESSAGE: 'Please provide an e-resource or description to continue',
};
export default {
  calloutMessages,

  waitLoading() {
    cy.expect(newAgreementLinePane.exists());
  },

  clickDescriptionField() {
    cy.do(newAgreementLinePane.find(descriptionTextArea).find(TextField()).click());
  },

  clickNoteField() {
    cy.do(newAgreementLinePane.find(noteTextArea).find(TextField()).click());
  },

  verifyDescriptionAlertMessage(message, isExists) {
    if (isExists) {
      cy.expect(descriptionTextArea.has({ error: message }));
    } else {
      cy.expect(TextArea({ label: 'Description', error: message }).absent());
    }
  },

  fillDescription(text) {
    cy.do([newAgreementLinePane.find(descriptionTextArea).fillIn(text)]);
  },

  saveAndClose() {
    cy.do(saveButton.click());
  },
};
