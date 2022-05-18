import { Pane, Checkbox, TextArea, Button } from '../../../../../interactors';
import Callout from '../../../../../interactors/callout';

const rootPane = Pane('Maximum number of items charged out');
const blockCheckboxes = {
  borrowing: Checkbox({ id:'blockBorrowing' }),
  renewals: Checkbox({ id:'blockRenewals' }),
  requests: Checkbox({ id:'blockRequests' }),
};
const message = rootPane.find(TextArea({ id:'message' }));
const saveButton = rootPane.find(Button('Save'));

const selectCheckbox = (specialBlockCheckbox) => {
  cy.do(specialBlockCheckbox.clickAndBlur());
};
const checkSaveButtonState = (isDisabled) => {
  cy.expect(saveButton.has({ disabled: isDisabled }));
};
const trySave = () => {
  cy.do(saveButton.click());
};

export default {
  clickByCheckbox: selectCheckbox,
  setMessage: (text) => {
    cy.do(message.fillIn(text));
  },
  checkSaveButtonState,
  blockCheckboxes,
  checkInitialState: () => {
    Object.values(blockCheckboxes).forEach(blockCheckbox => {
      cy.expect(rootPane.find(blockCheckbox).exists());
      cy.expect(rootPane.find(blockCheckbox).has({ disabled: false }));
      cy.expect(rootPane.find(blockCheckbox).has({ checked: false }));
      cy.expect(message.has({ textContent: '' }));
      checkSaveButtonState(true);
    });
  },
  // check red asterik presence
  checkRequiredMessageField:() => {
    cy.expect(rootPane.find(TextArea('Message to be displayed*')).exists());
  },
  trySave,
  checkEmptyMessageValidation : () => {
    cy.expect(message.has({ error: 'Message to be displayed is a required field if one or more Blocked actions selected' }));
  },
  checkRequiredCheckboxValidation : () => {
    cy.expect(message.has({ error: 'One or more Blocked actions must be selected for Message to be displayed to be used' }));
  },
  save : (specialConditionValue) => {
    cy.intercept('/patron-block-conditions').as('getCurrentConditions');
    trySave();
    cy.do(Callout(`The patron block condition ${specialConditionValue} has been successfully updated.`).dismiss());
    cy.wait('@getCurrentConditions');
    checkSaveButtonState(true);
  }


};
