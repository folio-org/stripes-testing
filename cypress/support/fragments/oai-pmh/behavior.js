import { Pane, Button, Select, Option } from '../../../../interactors';

const behaviorPane = Pane('Behavior');
const deletedRecordsSupportDropdown = Select('Deleted records support');
const suppressedRecordsProcessingDropdown = Select('Suppressed records processing');
const oaipmhErrorsProcessingDropdown = Select('OAI-PMH errors processing');
const recordSourceDropdown = Select('Record source');

export default {
  verifyBehaviorPane() {
    cy.expect([
      behaviorPane.exists(),
      behaviorPane.find(deletedRecordsSupportDropdown).exists(),
      behaviorPane.find(suppressedRecordsProcessingDropdown).exists(),
      behaviorPane.find(oaipmhErrorsProcessingDropdown).exists(),
      behaviorPane.find(recordSourceDropdown).exists(),
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
    cy.do(Button('Save').click());
  },
};
