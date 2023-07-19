import { including } from 'bigtest';
import { Pane, Button, Dropdown, TextField, MultiColumnListRow, TextArea, Accordion } from '../../../../../interactors';

const customFieldsPane = Pane('Custom fields');
const editNewButton = Button({ href: '/settings/users/custom-fields/edit' });
const addCustomFieldDropdown = Dropdown('Add custom field');
const saveAndCloseButton = Button('Save & close');
const saveLoseDataButton = Button('Save & lose data');
const UsersClick = Button('Users');
const permissionSet = Button('Permission sets');
const newButton = Button('+ New');
const permissionName = TextField({ id: 'input-permission-title' });
const permissionDesc = TextArea({ id: 'input-permission-description' });
const addPermissionBtn = Button('Add permission');


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
  createPermission(data) {
    cy.do([permissionName.fillIn(data.name), permissionDesc.fillIn(data.description), addPermissionBtn.click(), saveAndCloseButton.click()]);
  },

  addCustomTextField(data) {
    cy.do([editNewButton.click(),
      addCustomFieldDropdown.choose('Text field'),
      TextField('Field label*').fillIn(data.fieldLabel),
      TextField('Help text').fillIn(data.helpText),
      saveAndCloseButton.click()]);
    cy.wait(5000);
  },

  addCustomTextArea(data) {
    cy.do([editNewButton.click(),
      addCustomFieldDropdown.choose('Text area'),
      TextField('Field label*').fillIn(data.fieldLabel),
      TextField('Help text').fillIn(data.helpText),
      saveAndCloseButton.click()]);
    cy.wait(5000);
  },

  addCustomCheckBox(data) {
    cy.do([editNewButton.click(),
      addCustomFieldDropdown.choose('Checkbox'),
      TextField('Field label*').fillIn(data.fieldLabel),
      TextField('Help text').fillIn(data.helpText),
      saveAndCloseButton.click()]);
    cy.wait(5000);
  },


  addCustomRadioButton({ data }) {
    cy.do([
      editNewButton.click(),
      addCustomFieldDropdown.choose('Radio button set'),
      TextField('Field label*').fillIn(data.fieldLabel),
      TextField('Help text').fillIn(data.helpText),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(data.label1),
      MultiColumnListRow({ indexRow: 'row-2' }).find(TextField()).fillIn(data.label2),
      saveAndCloseButton.click(),
    ]);
  },

  addCustomSingleSelect({ data }) {
    cy.do([
      editNewButton.click(),
      addCustomFieldDropdown.choose('Single select'),
      TextField('Field label*').fillIn(data.fieldLabel),
      TextField('Help text').fillIn(data.helpText),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(data.label1),
      MultiColumnListRow({ indexRow: 'row-2' }).find(TextField()).fillIn(data.label2),
      saveAndCloseButton.click(),
    ]);
  },
  editButton() {
    cy.do([
      editNewButton.click()]);
  }
};

