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
  DropdownMenu,
  KeyValue,
  Checkbox,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';

const actionsButton = Button('Actions');
const editButton = Button('Edit');
const duplicateButton = Button('Duplicate');
const nameTextfield = TextField('Name*');
const cancelButton = Button('Cancel');
const deleteButton = Button('Delete');
const saveAndCloseButton = Button('Save & close');
const xButton = Button({ icon: 'times' });
const selectMappingProfileDropdown = Select('Mapping profile*');
const descriptionField = TextArea('Description');
const lockProfileCheckbox = Checkbox('Lock profile');

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

  verifyLockProfileCheckbox(isChecked, isDisabled) {
    cy.expect(lockProfileCheckbox.has({ checked: isChecked, disabled: isDisabled }));
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

  verifyActionsMenuOptions() {
    cy.expect([
      DropdownMenu().find(editButton).exists(),
      DropdownMenu().find(duplicateButton).exists(),
      DropdownMenu().find(deleteButton).exists(),
    ]);
  },

  verifySaveAndCloseButtonDisabled(isDisabled = true) {
    cy.expect(saveAndCloseButton.has({ disabled: isDisabled }));
  },

  verifyCancelButtonDisabled(isDisabled = true) {
    cy.expect(cancelButton.has({ disabled: isDisabled }));
  },

  verifyXButtonDisabled(isDisabled = true) {
    cy.expect(xButton.has({ disabled: isDisabled }));
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
    cy.do(xButton.click());
  },

  verifyViewProfileDetails(name, mappingProfile, description) {
    cy.expect([
      KeyValue('Name').has({ value: name }),
      KeyValue('Mapping profile').has({ value: mappingProfile }),
      KeyValue('Description').has({ value: description }),
    ]);
  },
};
