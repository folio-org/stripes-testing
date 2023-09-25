import { including } from 'bigtest';
import {
  Accordion,
  Button,
  Dropdown,
  Modal,
  MultiColumnListRow,
  Pane,
  TextField,
} from '../../../../../interactors';

const customFieldsPane = Pane('Custom fields');
const editNewButton = Button({ href: '/settings/users/custom-fields/edit' });
const addCustomFieldDropdown = Dropdown('Add custom field');
const saveAndCloseButton = Button('Save & close');
const saveLoseDataButton = Button('Save & lose data');
const fieldLabel = TextField('Field label*');
const helpText = TextField('Help text');

export default {
  waitLoading() {
    cy.expect(customFieldsPane.exists());
  },

  addMultiSelectCustomField(data) {
    cy.do([
      editNewButton.click(),
      addCustomFieldDropdown.choose('Multi-select'),
      TextField('Field label*').fillIn(data.fieldLabel),
      MultiColumnListRow({ indexRow: 'row-0' }).find(TextField()).fillIn(data.label1),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(data.label2),
      saveAndCloseButton.click(),
    ]);
  },
  editMultiSelectCustomField(oldData, newData) {
    cy.do([
      editNewButton.click(),
      Accordion(including(oldData.fieldLabel)).clickHeader(),
      TextField('Field label*').fillIn(newData.fieldLabel),
      MultiColumnListRow({ indexRow: 'row-0' }).find(TextField()).fillIn(newData.label1),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(newData.label2),
      saveAndCloseButton.click(),
    ]);
    // Wait for changes to be saved and reflected
    cy.wait(15000);
  },

  deleteCustomField(name) {
    cy.do([
      editNewButton.click(),
      Accordion(including(name))
        .find(Button({ icon: 'trash' }))
        .click(),
      saveAndCloseButton.click(),
      saveLoseDataButton.click(),
    ]);
  },

  addCustomTextField(data) {
    cy.do([
      editNewButton.click(),
      addCustomFieldDropdown.choose('Text field'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      saveAndCloseButton.click(),
    ]);
    cy.expect(saveAndCloseButton.absent());
    cy.expect(Accordion(`${data.fieldLabel} · Text field`).exists());
  },

  addCustomTextArea(data) {
    cy.do([
      editNewButton.click(),
      addCustomFieldDropdown.choose('Text area'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      saveAndCloseButton.click(),
    ]);
    cy.expect(saveAndCloseButton.absent());
    cy.expect(Accordion(`${data.fieldLabel} · Text area`).exists());
  },

  addTextAreaCustomField(text) {
    cy.do([
      editNewButton.click(),
      addCustomFieldDropdown.choose('Text area'),
      TextField('Field label*').fillIn(text),
      saveAndCloseButton.click(),
    ]);
  },

  addCustomCheckBox(data) {
    cy.do([
      editNewButton.click(),
      addCustomFieldDropdown.choose('Checkbox'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      saveAndCloseButton.click(),
    ]);
    cy.expect(saveAndCloseButton.absent());
    cy.expect(Accordion(`${data.fieldLabel} · Checkbox`).exists());
  },

  addCustomRadioButton({ data }) {
    cy.do([
      editNewButton.click(),
      addCustomFieldDropdown.choose('Radio button set'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(data.label1),
      MultiColumnListRow({ indexRow: 'row-2' }).find(TextField()).fillIn(data.label2),
      saveAndCloseButton.click(),
    ]);
    cy.expect(saveAndCloseButton.absent());
    cy.expect(Accordion(`${data.fieldLabel} · Radio button set`).exists());
  },

  addCustomSingleSelect({ data }) {
    cy.do([
      editNewButton.click(),
      addCustomFieldDropdown.choose('Single select'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(data.firstLabel),
      MultiColumnListRow({ indexRow: 'row-2' }).find(TextField()).fillIn(data.secondLabel),
      saveAndCloseButton.click(),
    ]);
    cy.expect(saveAndCloseButton.absent());
    cy.expect(Accordion(`${data.fieldLabel} · Single select`).exists());
  },

  editButton() {
    cy.expect(editNewButton.exists());
    cy.do([editNewButton.click()]);
  },

  confirmDeletion() {
    cy.do(Button('Save & close').click());
    cy.do(Modal('Delete field data').find(Button('Save & lose data')).click());
  },

  verifyDeletedCustomFields(field) {
    cy.expect(Accordion(field).absent());
  },
};
