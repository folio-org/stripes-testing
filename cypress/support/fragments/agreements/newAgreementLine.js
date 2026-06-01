import { TextField } from '@interactors/html';
import { Button, HTML, Pane, TextArea } from '../../../../interactors';
import SelectEHoldingsModal from './modals/selectEHoldingsModal';

const newAgreementLinePane = Pane({ id: 'pane-agreement-line-form' });
const descriptionTextArea = TextArea({ label: 'Description' });
const noteTextArea = TextArea({ label: 'Note' });
const saveButton = Button('Save & close');
const eHoldingsToggleButton = Button({ id: 'clickable-nav-eresources' });
const linkEResourceButton = Button('Link e-resource');

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
    cy.expect(newAgreementLinePane.absent());
  },

  verifyEHoldingsTabIsSelected() {
    cy.do(
      eHoldingsToggleButton.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },

  clickEHoldingsTab() {
    cy.do(newAgreementLinePane.find(eHoldingsToggleButton).click());
    this.verifyEHoldingsTabIsSelected();
  },

  clickLinkEResource() {
    cy.do(newAgreementLinePane.find(linkEResourceButton).click());
    SelectEHoldingsModal.waitLoading();
  },

  verifyLinkedEResourceIsDisplayed(eResourceName) {
    cy.expect(newAgreementLinePane.find(HTML(eResourceName)).exists());
  },
};
