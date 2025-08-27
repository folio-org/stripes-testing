import { Checkbox, Pane, TextField, Button } from '../../../../../interactors';

const technicalPane = Pane('Technical');
const maxRecordPerResponseTextfield = TextField('Max records per response*');
const enableValidationCheckbox = Checkbox('Enable validation');
const formattedOutputCheckbox = Checkbox('Formatted output');
const saveButton = Button('Save');

export default {
  verifyTechnicalPane(disabled = false) {
    cy.expect([
      technicalPane.exists(),
      maxRecordPerResponseTextfield.has({ disabled, hasValue: true }),
      enableValidationCheckbox.has({ disabled, checked: false }),
      formattedOutputCheckbox.has({ disabled, checked: false }),
    ]);
  },

  verifySaveButton(disabled = false) {
    cy.expect(saveButton.has({ disabled }));
  },
};
