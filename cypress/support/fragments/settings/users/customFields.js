import { including } from 'bigtest';
import { Accordion, Button, Callout, Dropdown, Modal, MultiColumnListRow, Pane, Spinner, TextArea, TextField } from '../../../../../interactors';


const customFieldsPane = Pane('Custom fields');
const editNewButton = Button({ href: '/settings/users/custom-fields/edit' });
const addCustomFieldDropdown = Dropdown('Add custom field');
const saveAndCloseButton = Button('Save & close');
const newButton = Button('+ New');
const permissionTitle = TextField({ id: 'input-permission-title' });
const permissionDescription = TextArea({ id: 'input-permission-description' });
const addPermissionButton = Button('Add permission');
const fieldLabel = TextField('Field label*');
const helpText = TextField('Help text');
const editButton = Button('Edit');
const deleteButton = Button('Delete');
const deleteConfirmationModal = Modal({ id: 'deletepermissionset-confirmation' });
const deleteButtonInConfirmation = Button('Delete', { id: 'clickable-deletepermissionset-confirmation-confirm' });


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
  },
  clickONewButton() {
    cy.do(newButton.click());
  },

  deletePermission(data) {
    cy.do([editButton.click(),
      deleteButton.click(),
      deleteConfirmationModal.find(deleteButtonInConfirmation).click()]);
    cy.expect(Callout({ type: 'success' }).has({ text: including(`The permission set ${data.name} was successfully deleted.`) }));
  },

  createPermission(data) {
    cy.do([permissionTitle.fillIn(data.name), permissionDescription.fillIn(data.description), addPermissionButton.click(), saveAndCloseButton.click()]);
    cy.expect(Callout({ type: 'success' }).has({ text: including(`The permission set ${data.name} was successfully created`) }));
  },

  addCustomTextField(data) {
    cy.do([editNewButton.click(),
      addCustomFieldDropdown.choose('Text field'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      saveAndCloseButton.click()]);
    cy.expect(Spinner().absent());
  },

  addCustomTextArea(data) {
    cy.do([editNewButton.click(),
      addCustomFieldDropdown.choose('Text area'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      saveAndCloseButton.click()]);
    cy.expect(Spinner().absent());
  },

  addCustomCheckBox(data) {
    cy.do([editNewButton.click(),
      addCustomFieldDropdown.choose('Checkbox'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      saveAndCloseButton.click()]);
    cy.expect(Spinner().absent());
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
  },

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
  },

  removeCustomField(field) {
    cy.do(Accordion(field).find(Button({ icon: 'trash' })).click());
  },

  deleteCustomFields() {
    cy.do(Button('Save & close').click());
    cy.do(Modal('Delete field data').find(Button('Save & lose data')).click());
  },

  verifyDeletedCustomFields(field) {
    cy.expect(Accordion(field).absent());
  }
};

