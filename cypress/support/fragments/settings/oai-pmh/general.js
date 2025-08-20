import { matching } from '@interactors/html';
import { Checkbox, Pane, Select, TextArea, TextField, Button } from '../../../../../interactors';

const generalPane = Pane('General');
const enableOaiServiceCheckbox = Checkbox('Enable OAI service');
const repositoryNameTextfield = TextField('Repository name*');
const baseUrlTextfield = TextField('Base URL*');
const timeGranularityDropdown = Select('Time granularity');
const adminEmailTextarea = TextArea('Administrator email(s)*');
const saveButton = Button('Save');

export default {
  verifyGeneralPane(disabled = false) {
    cy.expect([
      generalPane.exists(),
      enableOaiServiceCheckbox.has({ disabled, checked: true }),
      repositoryNameTextfield.has({ disabled, hasValue: true }),
      baseUrlTextfield.has({ disabled, value: matching(/^(https:|http:|www\.)\S*/gm) }),
      timeGranularityDropdown.has({ disabled, hasValue: true }),
      adminEmailTextarea.has({ disabled, value: matching(/^\S+@\S+\.\S+$/gm) }),
    ]);
  },

  verifySaveButton(disabled = false) {
    cy.expect(saveButton.has({ disabled }));
  },
};
