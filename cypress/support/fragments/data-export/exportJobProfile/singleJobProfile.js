import { including } from '@interactors/html';
import {
  Accordion,
  PaneHeader,
  Button,
  TextField,
  TextArea,
  Select,
  Modal,
  MultiColumnListCell,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

const actionsButton = Button('Actions');
const editButton = Button('Edit');
const duplicateButton = Button('Duplicate');
const nameTextfield = TextField('Name*');
const cancelButton = Button('Cancel');
const deleteButton = Button('Delete');
const selectMappingProfileDropdown = Select('Mapping profile*');
const descriptionField = TextArea('Description');

export default {
  waitLoading(name) {
    cy.expect(PaneHeader(name).exists());
  },

  verifyElements() {
    cy.expect([
      actionsButton.has({ disabled: false }),
      Button({ ariaLabel: 'Cancel' }).has({ disabled: false }),
    ]);
  },

  verifyProfileDetailsEditable() {
    cy.expect([
      TextField('Name*').exists(),
      selectMappingProfileDropdown.exists(),
      descriptionField.exists(),
    ]);
  },

  verifyProfileFieldsValues(name, mappingProfile, description) {
    cy.expect([
      nameTextfield.has({ value: name }),
      selectMappingProfileDropdown.has({ checkedOptionText: mappingProfile }),
      descriptionField.has({ value: description }),
    ]);
  },

  verifySource(source) {
    cy.expect(
      Accordion({ headline: 'Update information' }).has({
        content: including(`Source: ${source}`),
      }),
    );
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

  editJobProfile(newName) {
    cy.do([nameTextfield.clear(), nameTextfield.fillIn(newName)]);
  },

  deleteMappingProfile: (name) => {
    cy.do([actionsButton.click(), deleteButton.click(), Modal().find(deleteButton).click()]);
    InteractorsTools.checkCalloutMessage(`Job profile ${name} has been successfully deleted`);
    cy.expect(MultiColumnListCell(name).absent());
  },

  verifyActionsButtonAbsent() {
    cy.expect(actionsButton.absent());
  },

  clickXButton() {
    cy.do(Button({ icon: 'times' }).click());
  },
};
