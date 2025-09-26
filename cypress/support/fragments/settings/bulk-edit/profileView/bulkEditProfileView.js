import {
  Pane,
  Button,
  Checkbox,
  Headline,
  KeyValue,
  RepeatableFieldItem,
  Select,
  Selection,
  TextArea,
  Accordion,
  or,
} from '../../../../../../interactors';

const profileViewPane = Pane({ id: 'pane-bulk-edit-profile-details' });
const bulkEditsAccordion = Accordion(or('Bulk edits for administrative data', 'Bulk edits'));
const getTargetRow = (rowIndex = 0) => RepeatableFieldItem({ index: rowIndex });

export default {
  bulkEditsAccordion,
  getTargetRow,

  waitLoading() {
    cy.expect(profileViewPane.exists());
  },

  verifyProfileDetails(name, description) {
    cy.expect([
      profileViewPane.has({ title: name }),
      profileViewPane.find(Headline(name)).exists(),
      profileViewPane.find(KeyValue('Description')).has({ value: description }),
    ]);
  },

  verifySelectedOption(option, rowIndex = 0) {
    cy.expect(
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(Selection({ singleValue: option }))
        .visible(),
    );
  },

  verifySelectedAction(action, rowIndex = 0) {
    cy.expect(
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(Select({ dataTestID: 'select-actions-0' }))
        .has({ checkedOptionText: action }),
    );
  },

  verifySelectedSecondAction(action, rowIndex = 0) {
    cy.expect(
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(Select({ dataTestID: 'select-actions-1' }))
        .has({ checkedOptionText: action }),
    );
  },

  verifySelectedLocation(location, rowIndex = 0) {
    cy.expect(
      getTargetRow(rowIndex)
        .find(Selection({ singleValue: location }))
        .visible(),
    );
  },

  verifyTextInDataTextArea(text, rowIndex = 0) {
    cy.expect(
      getTargetRow(rowIndex)
        .find(TextArea({ dataTestID: 'input-textarea-0' }))
        .has({ textContent: text }),
    );
  },

  verifyStaffOnlyCheckboxChecked(rowIndex = 0) {
    cy.expect(
      getTargetRow(rowIndex).find(Checkbox('Staff only')).has({ checked: true, disabled: true }),
    );
  },

  clickCloseFormButton() {
    cy.do(profileViewPane.find(Button({ icon: 'times' })).click());
  },
};
