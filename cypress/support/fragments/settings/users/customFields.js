import { including } from '@interactors/html';
import {
  Accordion,
  Button,
  Checkbox,
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
const getEditCustomFieldAccordion = (fieldLabelText) => {
  return editCustomFieldsPane.find(
    Accordion({ label: including(fieldLabelText), isWrapper: false }),
  );
};
const getCustomFieldSection = (fieldLabelText) => {
  return customFieldsPane.find(Section({ label: including(fieldLabelText) }));
};
const findCustomFieldSectionByLabel = (fieldLabelText) => {
  return customFieldsPane.find(Section({ label: including(fieldLabelText) }));
};

export default {
  openTabFromInventorySettingsList() {
    cy.do(NavListItem('Users').click());
    cy.do(NavListItem('Custom fields').click());
  },

  waitLoading() {
    cy.expect(customFieldsPane.exists());
  },

  verifyCustomFieldsPaneIsOpen() {
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

  openEdit() {
    this.editButton();
  },

  verifyCustomFieldsPresent(fieldLabels) {
    fieldLabels.forEach((fieldLabelText) => {
      cy.expect(getEditCustomFieldAccordion(fieldLabelText).exists());
    });
  },

  expandCustomFieldInEditPane(fieldLabelText) {
    const fieldAccordion = getEditCustomFieldAccordion(fieldLabelText);

    cy.expect(fieldAccordion.exists());
    cy.do(fieldAccordion.clickHeader());
    cy.expect(fieldAccordion.has({ open: true }));
  },

  verifyRequiredOptionVisible(fieldLabelText, isVisible = true) {
    const checkboxInteractor = getEditCustomFieldAccordion(fieldLabelText).find(
      Checkbox('Required'),
    );
    if (isVisible) {
      checkboxInteractor.exists();
    } else {
      checkboxInteractor.absent();
    }
  },

  setRequiredOption(fieldLabelText) {
    const requiredCheckbox = getEditCustomFieldAccordion(fieldLabelText).find(Checkbox('Required'));
    cy.do(requiredCheckbox.click());
    cy.expect(requiredCheckbox.has({ checked: true }));
  },

  verifySaveAndCloseButtonEnabled() {
    cy.expect(saveAndCloseButton.has({ disabled: false }));
  },

  saveAndClose() {
    this.verifySaveAndCloseButtonEnabled();
    cy.do(saveAndCloseButton.click());
    cy.expect(editCustomFieldsPane.absent());
    this.verifyCustomFieldsPaneIsOpen();
  },

  expandCustomFieldInViewPane(fieldLabelText) {
    const customFieldSection = getCustomFieldSection(fieldLabelText);

    cy.expect(customFieldSection.exists());
    cy.do(customFieldSection.toggle());
    cy.expect(getCustomFieldSection(fieldLabelText).has({ expanded: true }));
  },

  verifyRequiredValue(fieldLabelText, checked = true) {
    findCustomFieldSectionByLabel(fieldLabelText).find(
      Checkbox('Required', { disabled: true, checked }),
    );
  },

  addMultiSelectCustomField(data) {
    this.clickEditNewButton();
    cy.do([
      addCustomFieldDropdown.choose('Multi-select'),
      TextField('Field label*').fillIn(data.fieldLabel),
      MultiColumnListRow({ indexRow: 'row-0' }).find(TextField()).fillIn(data.label1),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(data.label2),
    ]);
    this.saveAndClose();
    cy.wait(15000);
    this.verifyCustomFieldExists(data.fieldLabel);
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
    ]);
    this.saveAndClose();
    // Wait for changes to be saved and reflected
    cy.wait(15000);
  },
  // It supports passing a single field name as a string or an array of field names for bulk deletion
  deleteCustomField(name) {
    this.editButton();

    [].concat(name).forEach((fieldName) => {
      cy.do([
        Accordion({ label: including(fieldName), isWrapper: false })
          .find(Button({ icon: 'trash' }))
          .click(),
      ]);
    });

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
    this.saveAndClose();
    this.verifyCustomFieldExists(data.fieldLabel);
  },

  addCustomTextArea(data) {
    this.editButton();
    cy.do([
      addCustomFieldDropdown.choose('Text area'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
    ]);
    this.saveAndClose();
    this.verifyCustomFieldExists(data.fieldLabel);
  },

  addTextAreaCustomField(text) {
    this.editButton();
    cy.do([addCustomFieldDropdown.choose('Text area'), TextField('Field label*').fillIn(text)]);
    this.saveAndClose();
  },

  addCustomCheckBox(data) {
    this.editButton();
    cy.do([
      addCustomFieldDropdown.choose('Checkbox'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
    ]);
    this.saveAndClose();
    this.verifyCustomFieldExists(data.fieldLabel);
  },

  addCustomDatePicker(data) {
    this.editButton();
    cy.do([
      addCustomFieldDropdown.choose('Date picker'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
    ]);
    this.saveAndClose();
    this.verifyCustomFieldExists(data.fieldLabel);
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
    this.saveAndClose();
    this.verifyCustomFieldExists(data.fieldLabel);
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
    this.saveAndClose();
    this.verifyCustomFieldExists(data.fieldLabel);
  },

  editButton() {
    cy.expect(editNewButton.exists());
    // wait needs to fill the fields
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
    return cy.getModUsersVersion().then((modUsersVersion) => {
      return cy
        .okapiRequest({
          method: 'GET',
          path: 'custom-fields',
          isDefaultSearchParamsRequired: false,
          additionalHeaders: { 'x-okapi-module-id': modUsersVersion },
        })
        .then((response) => {
          return response.body;
        });
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
