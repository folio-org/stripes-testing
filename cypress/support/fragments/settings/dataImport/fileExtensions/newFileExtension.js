import { including } from '@interactors/html';
import { Pane, TextField, MultiSelect, Button, Callout } from '../../../../../../interactors';

const verifyNewFileExtensionFormIsOpened = () => cy.expect(Pane('New file extension mapping').exists());

export default {
  verifyNewFileExtensionFormIsOpened,
  fill: (data) => {
    // TODO need to wait until page will be uploaded
    cy.wait(2000);
    cy.do([
      TextField({ name: 'extension' }).fillIn(data.fileExtension),
      MultiSelect({ id: 'multiselect-3' }).select(data.dataType),
    ]);
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
