import { including } from 'bigtest';
import {
  Accordion,
  PaneHeader,
  MultiColumnListCell,
  KeyValue,
  Button,
  TextField,
  TextArea,
  Checkbox,
} from '../../../../../interactors';

const actionsButton = Button('Actions');
const editButton = Button('Edit');
const duplicateButton = Button('Duplicate');
const deleteButton = Button('Delete');
const nameTextfield = TextField('Name*');
const descriptionTextarea = TextArea('Description');
const saveAndCloseButton = Button('Save & close');
const cancelButton = Button('Cancel');

export default {
  clickProfileNameFromTheList(name) {
    cy.do(MultiColumnListCell(including(name)).click());
  },

  waitLoading(name) {
    cy.expect(PaneHeader(name).exists());
  },

  verifyProfileDetails(profileDetails) {
    cy.expect([
      KeyValue('Name').has({ value: profileDetails.name }),
      KeyValue('FOLIO record type').has({ value: profileDetails.recordType }),
      KeyValue('Output format').has({ value: profileDetails.outputFormat }),
      KeyValue('Description').has({ value: profileDetails.description }),
      Accordion({ headline: 'Update information' }).has({
        content: including(`Source: ${profileDetails.source}`),
      }),
    ]);
  },

  verifyElements() {
    cy.expect([
      actionsButton.has({ disabled: false }),
      Button({ ariaLabel: 'Cancel' }).has({ disabled: false }),
    ]);
  },

  verifyOnlyDuplicateOptionAvailable() {
    this.openActions();
    cy.expect([
      editButton.has({ disabled: true }),
      duplicateButton.has({ disabled: false }),
      deleteButton.has({ disabled: true }),
    ]);
  },

  verifyActionOptions() {
    this.openActions();
    cy.expect([
      editButton.has({ disabled: false }),
      duplicateButton.has({ disabled: false }),
      deleteButton.has({ disabled: false }),
    ]);
  },

  editFieldMappingProfile(newName, newDescription) {
    this.clickEditButton();
    // Need to wait for page to reload
    cy.wait(2000);
    cy.do([
      nameTextfield.clear(),
      nameTextfield.fillIn(newName),
      descriptionTextarea.fillIn(newDescription),
    ]);
  },

  duplicateFieldMappingProfile() {
    cy.do([duplicateButton.click(), saveAndCloseButton.click()]);
  },

  clickEditTransformations() {
    cy.do(Accordion('Transformations').find(Button('Edit transformations')).click());
  },

  checkRecordType(recordType) {
    cy.do(Checkbox(recordType).click());
  },

  openActions() {
    cy.do(actionsButton.click());
  },

  clickEditButton() {
    cy.do(editButton.click());
  },

  clickDuplicateButton() {
    cy.do(duplicateButton.click());
  },

  clickCancelButton() {
    cy.do(cancelButton.click());
  },
};
