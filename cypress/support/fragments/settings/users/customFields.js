import { including } from 'bigtest';
import { Pane, Button, Dropdown, TextField, MultiColumnListRow, Accordion } from '../../../../../interactors';

const customFieldsPane = Pane('Custom fields');
const editNewButton = Button({ href: '/settings/users/custom-fields/edit' });
const addCustomFieldDropdown = Dropdown('Add custom field');
const saveAndCloseButton = Button('Save & close');
const saveLoseDataButton = Button('Save & lose data');

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
};
