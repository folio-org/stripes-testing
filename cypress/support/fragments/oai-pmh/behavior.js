import { Pane, Button, Select, Option } from '../../../../interactors';

const behaviorPane = Pane('Behavior');
const deletedRecordsSupportDropdown = Select('Deleted records support');
const suppressedRecordsProcessingDropdown = Select('Suppressed records processing');
const oaipmhErrorsProcessingDropdown = Select('OAI-PMH errors processing');
const recordSourceDropdown = Select('Record source');
const saveButton = Button('Save');

export default {
  verifyBehaviorPane(disabled = false) {
    cy.expect([
      behaviorPane.exists(),
      behaviorPane.find(deletedRecordsSupportDropdown).has({ disabled }),
      behaviorPane.find(suppressedRecordsProcessingDropdown).has({ disabled }),
      behaviorPane.find(oaipmhErrorsProcessingDropdown).has({ disabled }),
      behaviorPane.find(recordSourceDropdown).has({ disabled }),
    ]);
  },

  verifyRecordSourceDropdown() {
    cy.expect([
      recordSourceDropdown.find(Option('Source records storage')).exists(),
      recordSourceDropdown.find(Option('Inventory')).exists(),
      recordSourceDropdown.find(Option('Source records storage and Inventory')).exists(),
    ]);
  },

  pickFromRecordSourceDropdown(option) {
    cy.do(recordSourceDropdown.choose(option));
  },

  verifyRecordSourceDropdownDefaultValue(value) {
    cy.expect(recordSourceDropdown.has({ value }));
  },

  clickSave() {
    cy.do(saveButton.click());
  },

  verifySaveButton(disabled = false) {
    cy.expect(saveButton.has({ disabled }));
  },
};
