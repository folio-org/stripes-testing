import { including } from '@interactors/html';
import {
  Accordion,
  Button,
  Dropdown,
  Modal,
  MultiColumnListRow,
  NavListItem,
  Pane,
  Section,
  TextField,
} from '../../../../../interactors';

const customFieldsPane = Pane('Custom fields');
const editCustomFieldsPane = Pane('Edit custom fields');
const editNewButton = Button({ href: '/settings/users/custom-fields/edit' });
const addCustomFieldDropdown = Dropdown('Add custom field');
const addOptionButton = Button('Add option');
const saveAndCloseButton = Button('Save & close');
const saveLoseDataButton = Button('Save & lose data');
const fieldLabel = TextField('Field label*');
const helpText = TextField('Help text');

export default {
  openTabFromInventorySettingsList() {
    cy.do(NavListItem('Users').click());
    cy.do(NavListItem('Custom fields').click());
  },

  waitLoading() {
    cy.expect(customFieldsPane.exists());
  },

  verifyCustomFieldExists(name) {
    cy.expect(customFieldsPane.find(Section({ label: including(name) })).exists());
  },

  verifyEditCustomFieldsPaneIsOpen() {
    cy.expect(editCustomFieldsPane.exists());
  },

  verifyAddCustomFieldButtonIsActive() {
    cy.expect(addCustomFieldDropdown.exists());
  },

  addMultiSelectCustomField(data) {
    this.clickEditNewButton();
    cy.do([
      addCustomFieldDropdown.choose('Multi-select'),
      TextField('Field label*').fillIn(data.fieldLabel),
      MultiColumnListRow({ indexRow: 'row-0' }).find(TextField()).fillIn(data.label1),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(data.label2),
      saveAndCloseButton.click(),
    ]);
    cy.wait(15000);
  },

  fillMultiSelectCustomFieldOnly(data) {
    cy.do([
      addCustomFieldDropdown.choose('Multi-select'),
      TextField('Field label*').fillIn(data.fieldLabel),
      MultiColumnListRow({ indexRow: 'row-0' }).find(TextField()).fillIn(data.label1),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(data.label2),
    ]);
  },

  clickAddOptionButton() {
    cy.do(addOptionButton.click());
  },

  fillOptionInRow(rowIndex, optionText) {
    cy.do(
      MultiColumnListRow({ indexRow: `row-${rowIndex}` })
        .find(TextField())
        .fillIn(optionText),
    );
  },

  clickSaveAndClose() {
    cy.do(saveAndCloseButton.click());
    cy.wait(15000);
  },
  clickEditNewButton() {
    cy.do(editNewButton.click());
  },
  editMultiSelectCustomField(oldData, newData) {
    this.clickEditNewButton();
    cy.get('[class^="accordion---"]').contains(oldData.fieldLabel).click();
    cy.do([
      TextField('Field label*').fillIn(newData.fieldLabel),
      MultiColumnListRow({ indexRow: 'row-0' }).find(TextField()).fillIn(newData.label1),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(newData.label2),
      saveAndCloseButton.click(),
    ]);
    // Wait for changes to be saved and reflected
    cy.wait(15000);
  },
  deleteCustomField(name) {
    this.editButton();
    cy.do([
      Accordion({ label: including(name), isWrapper: false })
        .find(Button({ icon: 'trash' }))
        .click(),
    ]);
    cy.wait(500);
    cy.do(saveAndCloseButton.click());
    cy.wait(1000);
    cy.do(saveLoseDataButton.click());
    cy.wait(3000);
  },

  addCustomTextField(data) {
    this.editButton();
    cy.do([
      addCustomFieldDropdown.choose('Text field'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
    ]);
    cy.expect(saveAndCloseButton.is({ disabled: false }));
    cy.do(saveAndCloseButton.click());
    cy.expect(saveAndCloseButton.absent());
    cy.expect(Pane('Custom fields').exists());
    cy.expect(Accordion(`${data.fieldLabel} · Text field`).exists());
  },

  addCustomTextArea(data) {
    this.editButton();
    cy.do([
      addCustomFieldDropdown.choose('Text area'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
    ]);
    cy.expect(saveAndCloseButton.is({ disabled: false }));
    cy.do(saveAndCloseButton.click());
    cy.expect(saveAndCloseButton.absent());
    cy.expect(Accordion(`${data.fieldLabel} · Text area`).exists());
  },

  addTextAreaCustomField(text) {
    this.editButton();
    cy.do([
      addCustomFieldDropdown.choose('Text area'),
      TextField('Field label*').fillIn(text),
      saveAndCloseButton.click(),
    ]);
  },

  addCustomCheckBox(data) {
    this.editButton();
    cy.do([
      addCustomFieldDropdown.choose('Checkbox'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
    ]);
    cy.expect(saveAndCloseButton.is({ disabled: false }));
    cy.do(saveAndCloseButton.click());
    cy.expect(saveAndCloseButton.absent());
    cy.expect(Pane('Custom fields').exists());
    cy.expect(Accordion(`${data.fieldLabel} · Checkbox`).exists());
  },

  addCustomRadioButton({ data }) {
    this.editButton();
    cy.do([
      addCustomFieldDropdown.choose('Radio button set'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(data.label1),
      MultiColumnListRow({ indexRow: 'row-2' }).find(TextField()).fillIn(data.label2),
    ]);
    cy.expect(saveAndCloseButton.is({ disabled: false }));
    cy.do(saveAndCloseButton.click());
    cy.expect(saveAndCloseButton.absent());
    cy.expect(Accordion(`${data.fieldLabel} · Radio button set`).exists());
  },

  addCustomSingleSelect({ data }) {
    this.editButton();
    cy.do([
      addCustomFieldDropdown.choose('Single select'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(data.firstLabel),
      MultiColumnListRow({ indexRow: 'row-2' }).find(TextField()).fillIn(data.secondLabel),
    ]);
    cy.expect(saveAndCloseButton.is({ disabled: false }));
    cy.do(saveAndCloseButton.click());
    cy.expect(saveAndCloseButton.absent());
    cy.expect(Pane('Custom fields').exists());
    cy.expect(Accordion(`${data.fieldLabel} · Single select`).exists());
  },

  editButton() {
    cy.expect(editNewButton.exists());
    // wait needs to fill the fileds
    cy.wait(1000);
    this.clickEditNewButton();
    cy.expect(Pane('Edit custom fields').exists());
  },

  confirmDeletion() {
    cy.do(Button('Save & close').click());
    cy.do(Modal('Delete field data').find(Button('Save & lose data')).click());
  },

  verifyDeletedCustomFields(field) {
    cy.expect(Accordion({ label: field.fieldLabel }).absent());
  },

  verifyEditButtonAbsent() {
    cy.expect(editNewButton.absent());
  },

  // API methods

  getCustomFieldsViaApi() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'custom-fields?limit=2147483647',
        isDefaultSearchParamsRequired: false,
        additionalHeaders: { 'x-okapi-module-id': 'mod-users-19.6.0-SNAPSHOT.369' },
      })
      .then((response) => {
        return response.body;
      });
  },
  getCustomFieldsConfigViaApi() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'settings/entries?query=(scope==ui-users.custom-fields-label.manage and key==custom_fields_label)',
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        return response.body;
      });
  },
};
