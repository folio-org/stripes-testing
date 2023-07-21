import { including } from 'bigtest';
import { Pane, Button, Dropdown, TextField, MultiColumnListRow, TextArea, Accordion, Spinner } from '../../../../../interactors';

const customFieldsPane = Pane('Custom fields');
const editNewButton = Button({ href: '/settings/users/custom-fields/edit' });
const addCustomFieldDropdown = Dropdown('Add custom field');
const saveAndCloseButton = Button('Save & close');
const saveLoseDataButton = Button('Save & lose data');
const newButton = Button('+ New');
const permissionName = TextField({ id: 'input-permission-title' });
const permissionDesc = TextArea({ id: 'input-permission-description' });
const addPermissionBtn = Button('Add permission');
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

  addTextAreaCustomField(text) {
    cy.do([
      editNewButton.click(),
      addCustomFieldDropdown.choose('Text area'),
      TextField('Field label*').fillIn(text),
      saveAndCloseButton.click(),
    ]);
  },

  deleteCustomField(name) {
    cy.do([
      editNewButton.click(),
      Accordion(including(name)).find(Button({ icon: 'trash' })).click(),
      saveAndCloseButton.click(),
      saveLoseDataButton.click(),
    ]);
  },
  clickONewButton() {
    cy.do(newButton.click());
  },
  // Creating New permission
  createPermission(data) {
    cy.do([permissionName.fillIn(data.name), permissionDesc.fillIn(data.description), addPermissionBtn.click(), saveAndCloseButton.click()]);
  },

  // Adding text field custom fields
  addCustomTextField(data) {
    cy.do([editNewButton.click(),
      addCustomFieldDropdown.choose('Text field'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      saveAndCloseButton.click()]);
    cy.expect(Spinner().absent());
  },


  // Adding text area custom fields
  addCustomTextArea(data) {
    cy.do([editNewButton.click(),
      addCustomFieldDropdown.choose('Text area'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      saveAndCloseButton.click()]);
    cy.expect(Spinner().absent());
  },


  // Adding checkbox custom fields
  addCustomCheckBox(data) {
    cy.do([editNewButton.click(),
      addCustomFieldDropdown.choose('Checkbox'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      saveAndCloseButton.click()]);
    cy.expect(Spinner().absent());
  },

  // Adding Radio Button custom fields
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
  },

  // Adding Single Select custom fields
  addCustomSingleSelect({ data }) {
    cy.do([
      editNewButton.click(),
      addCustomFieldDropdown.choose('Single select'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(data.label1),
      MultiColumnListRow({ indexRow: 'row-2' }).find(TextField()).fillIn(data.label2),
      saveAndCloseButton.click(),
    ]);
  },

  editButton() {
    cy.expect(editNewButton.exists());
    cy.do([
      editNewButton.click()]);
  }
};

