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
  MetaSection,
  including,
  or,
  matching,
} from '../../../../../../interactors';
import DateTools from '../../../../utils/dateTools';

const profileViewPane = Pane({ id: 'pane-bulk-edit-profile-details' });
const bulkEditsAccordion = Accordion(or('Bulk edits for administrative data', 'Bulk edits'));
const summaryAccordion = Accordion('Summary');
const editButton = Button('Edit');
const duplicateButton = Button('Duplicate');
const deleteButton = Button('Delete');
const closeFormButton = Button({ icon: 'times' });
const collapseAllLink = Button('Collapse all');
const expandAllLink = Button('Expand all');
const lockProfileCheckbox = summaryAccordion.find(Checkbox({ id: 'lockProfile' }));
const metadataSection = summaryAccordion.find(MetaSection());
const getTargetRow = (rowIndex = 0) => RepeatableFieldItem({ index: rowIndex });

export default {
  bulkEditsAccordion,
  getTargetRow,

  waitLoading() {
    cy.expect(profileViewPane.exists());
    cy.wait(1000);
  },

  verifyProfileDetails(name, description) {
    cy.expect([
      closeFormButton.has({ disabled: false }),
      profileViewPane.has({ title: name }),
      profileViewPane.find(Headline(name)).exists(),
      profileViewPane.find(KeyValue('Description')).has({ value: description }),
      summaryAccordion.has({ open: true }),
      bulkEditsAccordion.has({ open: true }),
      collapseAllLink.exists(),
    ]);
    cy.title().should('eq', `Bulk edit settings - ${name} - FOLIO`);
  },

  verifyLockProfileCheckboxChecked(isChecked) {
    cy.expect(lockProfileCheckbox.has({ checked: isChecked, disabled: true }));
  },

  verifyMetadataSectionExists() {
    cy.expect(metadataSection.has({ open: false }));
  },

  expandMetadataSection() {
    cy.do(metadataSection.clickHeader());
  },

  verifyMetadataSection(userCreated, userUpdated) {
    const date = DateTools.getFormattedDateWithSlashes({ date: new Date() });
    const timePattern = '\\d{1,2}:\\d{2}\\s\\w{2}';

    cy.expect([
      metadataSection.has({
        content: matching(
          new RegExp(
            `Update information\\s*Record last updated: ${date} ${timePattern}\\s*Source: ${userUpdated}\\s+Record created: ${date} ${timePattern}\\s*Source: ${userCreated}\\s*`,
          ),
        ),
      }),
    ]);
  },

  clickCollapseAllLinkAndVerify() {
    cy.do(collapseAllLink.click());
    cy.expect([
      summaryAccordion.has({ open: false }),
      bulkEditsAccordion.has({ open: false }),
      expandAllLink.exists(),
    ]);
  },

  verifySelectedOption(option, rowIndex = 0) {
    cy.expect([
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(Selection({ singleValue: option }))
        .visible(),
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(Button({ text: including(option), disabled: true }))
        .exists(),
    ]);
  },

  verifySelectedAction(action, rowIndex = 0) {
    cy.expect(
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(Select({ dataTestID: 'select-actions-0' }))
        .has({ checkedOptionText: action, disabled: true }),
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
    cy.expect([
      getTargetRow(rowIndex)
        .find(Selection({ singleValue: location }))
        .visible(),
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(Button({ text: including(location), disabled: true }))
        .exists(),
    ]);
  },

  verifyTextInDataTextArea(text, rowIndex = 0) {
    cy.expect(
      bulkEditsAccordion
        .find(getTargetRow(rowIndex))
        .find(TextArea({ dataTestID: 'input-textarea-0' }))
        .has({ textContent: text, disabled: true }),
    );
  },

  verifyStaffOnlyCheckboxChecked(rowIndex = 0) {
    cy.expect(
      getTargetRow(rowIndex).find(Checkbox('Staff only')).has({ checked: true, disabled: true }),
    );
  },

  verifyActionsMenuOptions(config = {}) {
    const assertions = [];

    if (config.edit) assertions.push(editButton.exists());
    else assertions.push(editButton.absent());

    if (config.duplicate) assertions.push(duplicateButton.exists());
    else assertions.push(duplicateButton.absent());

    if (config.delete) assertions.push(deleteButton.exists());
    else assertions.push(deleteButton.absent());

    cy.expect(assertions);
  },

  selectEditProfile() {
    cy.do(editButton.click());
  },

  selectDeleteProfile() {
    cy.do(deleteButton.click());
  },

  clickCloseFormButton() {
    cy.do(closeFormButton.click());
  },

  clickActionsButton() {
    cy.do(profileViewPane.find(Button('Actions')).click());
    cy.wait(500);
  },
};
