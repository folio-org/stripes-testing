import {
  Pane,
  Accordion,
  Button,
  Checkbox,
  Modal,
  Callout,
  matching,
  including,
  MetaSection,
} from '../../../../../../interactors';

const hridHandlingPane = Pane('HRID handling');
const recordLastUpdatedAccordion = Accordion();
const removeLeadingZeroesCheckbox = Checkbox({ name: 'commonRetainLeadingZeroes' });
const SaveAndCloseButton = Button('Save & close');
const confirmEditHridModal = Modal({ id: 'confirm-edit-hrid-settings-modal' });

const calloutMessages = 'Setting was successfully updated.';

export default {
  calloutMessages,

  waitloading() {
    cy.expect(hridHandlingPane.exists());
  },

  recordLastUpdatedAccourdionLabelValueCorrect() {
    cy.expect(
      recordLastUpdatedAccordion.label(
        matching(/Record last updated: \d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2} (AM|PM)/),
      ).exists,
    );
  },

  clickRecordLastUpdatedAccordion() {
    cy.do(recordLastUpdatedAccordion.find(Button()).click());
  },

  clickRemoveLeadingZeroesCheckbox() {
    cy.do(removeLeadingZeroesCheckbox.click());
  },

  clickSaveAndCloseButton() {
    cy.do(SaveAndCloseButton.click());
  },

  clickUpdateButtonInConfirmEditHridModal() {
    cy.do(
      confirmEditHridModal
        .find(Button({ id: 'clickable-confirm-edit-hrid-settings-modal-confirm' }))
        .click(),
    );
  },

  checkRemoveLeadingZeroesAndSave() {
    cy.do(removeLeadingZeroesCheckbox.checkIfNotSelected());
    this.clickSaveAndCloseButton();
    cy.do(confirmEditHridModal.exists());
    this.clickUpdateButtonInConfirmEditHridModal();
    cy.expect(Callout({ textContent: calloutMessages }).exists());
  },

  uncheckRemoveLeadingZeroesAndSave() {
    cy.do(removeLeadingZeroesCheckbox.uncheckIfSelected());
    this.clickSaveAndCloseButton();
    cy.do(confirmEditHridModal.exists());
    this.clickUpdateButtonInConfirmEditHridModal();
    cy.expect(Callout({ textContent: calloutMessages }).exists());
  },

  uncheckRemoveLeadingZeroesIfCheckedAndSave() {
    if (!removeLeadingZeroesCheckbox.checked) {
      cy.do(removeLeadingZeroesCheckbox.uncheckIfSelected());
      this.clickSaveAndCloseButton();
      cy.do(confirmEditHridModal.exists());
      this.clickUpdateButtonInConfirmEditHridModal();
      cy.expect(Callout({ textContent: calloutMessages }).exists());
    }
  },

  verifyValueInRecordDetailsSection(value) {
    cy.expect(
      MetaSection().has({
        content: including(value),
      }),
    );
  },
};
