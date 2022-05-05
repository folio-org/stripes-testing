import { Button, Pane, Select, TextField, including, TextFieldIcon } from '../../../../../interactors';

const rootPane = Pane({ id: 'controlled-vocab-pane' });
const ownerSelect = rootPane.find(Select({ id:'select-owner' }));
const newButton = rootPane.find(Button({ id:'clickable-add-settings-payments' }));
const saveButton = rootPane.find(Button({ id:'clickable-save-settings-payments-0' }));
const nameTextField = rootPane.find(TextField({ placeholder:'nameMethod' }));


export default {
  checkControls:() => {
    cy.expect([ownerSelect.exists(),
      newButton.exists()]);
  },
  waitLoading: () => {
    cy.expect(newButton.exists());
  },
  pressNew:() => {
    cy.do(newButton.click());
  },
  checkFields:() => {
    cy.do(saveButton.click());
    cy.wait(3000);
    // message
    cy.expect(nameTextField.has({ error:'Please fill this in to continue' }));
    // red icon
    cy.expect(TextFieldIcon().has({ id: including('validation-error') }));
    // default value
    cy.expect(Select({ name:'items[0].allowedRefundMethod' }).has({ value: 'true' }));
  }
};
