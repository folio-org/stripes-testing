import { including } from '@interactors/html';
import {
  Pane,
  TextField,
  MultiSelect,
  Button,
  Callout,
  Checkbox,
} from '../../../../../../interactors';

const dataTypeSelect = MultiSelect({ label: 'Data type(s)*' });
const extensionField = TextField({ name: 'extension' });

const verifyNewFileExtensionFormIsOpened = () => cy.expect(Pane('New file extension mapping').exists());

export default {
  verifyNewFileExtensionFormIsOpened,
  fill: (data) => {
    // TODO need to wait until page will be uploaded
    cy.wait(2000);
    if (data.dataType) {
      cy.do([dataTypeSelect.focus(), dataTypeSelect.select(data.dataType)]);
    }
    cy.do([extensionField.focus(), extensionField.fillIn(data.fileExtension)]);
    if (data.importStatus) {
      cy.do(Checkbox({ name: 'importBlocked' }).click());
    }
  },
  save: () => {
    cy.do(Button('Save as file extension & Close').click());
  },

  verifyCalloutMessage: (message) => {
    cy.expect(
      Callout({
        textContent: including(message),
      }).exists(),
    );
  },
  verifyPreviouslyPopulatedDataIsNotDisplayed: () => {
    cy.expect([
      TextField({ name: 'extension' }).has({ value: '' }),
      MultiSelect({ id: 'multiselect-3' }).has({ filterValue: '' }),
    ]);
  },
};
