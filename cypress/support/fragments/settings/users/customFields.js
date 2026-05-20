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
  RadioButton,
  Section,
  Select,
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
const getDisplayInAccordionSelect = (fieldLabelText) => {
  return getEditCustomFieldAccordion(fieldLabelText).find(Select('Display in accordion'));
};
const getCustomFieldSection = (fieldLabelText) => {
  return customFieldsPane.find(Section({ label: including(fieldLabelText) }));
};
const findCustomFieldSectionByLabel = (fieldLabelText) => {
  return customFieldsPane.find(Section({ label: including(fieldLabelText) }));
};
const getViewCustomFieldOptionRow = (fieldLabelText, optionLabelText) => {
  return findCustomFieldSectionByLabel(fieldLabelText).find(
    MultiColumnListRow({ content: including(optionLabelText), isContainer: true }),
  );
};
const performOnEditCustomFieldOptionRow = (fieldLabelText, optionLabelText, callback) => {
  const optionTextField = getEditCustomFieldAccordion(fieldLabelText).find(
    TextField({ value: optionLabelText }),
  );

  cy.expect(optionTextField.exists());
  cy.do(
    optionTextField.perform((element) => {
      const rowIndex = element.closest('[data-row-index]').getAttribute('data-row-index');
      const optionRow = getEditCustomFieldAccordion(fieldLabelText).find(
        MultiColumnListRow({ indexRow: rowIndex }),
      );

      callback(optionRow);
    }),
  );
};

export default {
  openTabFromInventorySettingsList() {
    cy.expect(NavListItem('Users').exists());
    cy.do(NavListItem('Users').click());
    cy.expect(NavListItem('Custom fields').exists());
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

  setDisplayInAccordion(fieldLabelText, accordionLabel) {
    this.expandCustomFieldInEditPane(fieldLabelText);
    cy.expect(getDisplayInAccordionSelect(fieldLabelText).exists());
    cy.do(getDisplayInAccordionSelect(fieldLabelText).choose(accordionLabel));
  },

  setDisplayInAccordionForFields(fieldLabelTexts, accordionLabel) {
    [].concat(fieldLabelTexts).forEach((fieldLabelText) => {
      this.setDisplayInAccordion(fieldLabelText, accordionLabel);
    });
  },

  verifyDisplayInAccordion(fieldLabelText, accordionLabel) {
    cy.expect(
      getDisplayInAccordionSelect(fieldLabelText).has({ checkedOptionText: accordionLabel }),
    );
  },

  verifyDisplayInAccordionForFields(fieldLabelTexts, accordionLabel) {
    [].concat(fieldLabelTexts).forEach((fieldLabelText) => {
      this.verifyDisplayInAccordion(fieldLabelText, accordionLabel);
    });
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

  verifyDefaultCheckboxesVisible(fieldLabelText, optionLabels) {
    optionLabels.forEach((optionLabelText) => {
      performOnEditCustomFieldOptionRow(fieldLabelText, optionLabelText, (optionRow) => {
        cy.expect(optionRow.find(Checkbox()).exists());
      });
    });
  },

  setRequiredOption(fieldLabelText) {
    const requiredCheckbox = getEditCustomFieldAccordion(fieldLabelText).find(Checkbox('Required'));
    cy.do(requiredCheckbox.click());
    cy.expect(requiredCheckbox.has({ checked: true }));
  },

  setMultiSelectDefaults(fieldLabelText, optionLabels) {
    optionLabels.forEach((optionLabelText) => {
      performOnEditCustomFieldOptionRow(fieldLabelText, optionLabelText, (optionRow) => {
        const optionCheckbox = optionRow.find(Checkbox());

        cy.expect(optionCheckbox.exists());
        cy.do(optionCheckbox.click());
        cy.expect(optionCheckbox.has({ checked: true }));
      });
    });
  },

  setRadioButtonDefault(fieldLabelText, optionLabelText) {
    performOnEditCustomFieldOptionRow(fieldLabelText, optionLabelText, (optionRow) => {
      const optionRadioButton = optionRow.find(RadioButton());

      cy.expect(optionRadioButton.exists());
      cy.do(optionRadioButton.click());
      cy.expect(optionRadioButton.has({ checked: true }));
    });
  },

  setSingleSelectDefault(fieldLabelText, optionLabelText) {
    performOnEditCustomFieldOptionRow(fieldLabelText, optionLabelText, (optionRow) => {
      const optionRadioButton = optionRow.find(RadioButton());

      cy.expect(optionRadioButton.exists());
      cy.do(optionRadioButton.click());
      cy.expect(optionRadioButton.has({ checked: true }));
    });
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

  verifyMultiSelectDefaults(fieldLabelText, optionLabels) {
    optionLabels.forEach((optionLabelText) => {
      cy.expect(
        getViewCustomFieldOptionRow(fieldLabelText, optionLabelText)
          .find(Checkbox({ disabled: true, checked: true }))
          .exists(),
      );
    });
  },

  verifyRadioButtonDefault(fieldLabelText, optionLabelText) {
    cy.expect(
      getViewCustomFieldOptionRow(fieldLabelText, optionLabelText)
        .find(RadioButton({ disabled: true, checked: true }))
        .exists(),
    );
  },

  verifySingleSelectDefault(fieldLabelText, optionLabelText) {
    cy.expect(
      getViewCustomFieldOptionRow(fieldLabelText, optionLabelText)
        .find(RadioButton({ disabled: true, checked: true }))
        .exists(),
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

  fillCustomTextFieldOnly(data) {
    cy.do([
      addCustomFieldDropdown.choose('Text field'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
    ]);
  },

  fillCustomTextAreaOnly(data) {
    cy.do([
      addCustomFieldDropdown.choose('Text area'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
    ]);
  },

  fillCustomCheckBoxOnly(data) {
    cy.do([
      addCustomFieldDropdown.choose('Checkbox'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
    ]);
  },

  fillCustomDatePickerOnly(data) {
    cy.do([
      addCustomFieldDropdown.choose('Date picker'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
    ]);
  },

  fillCustomRadioButtonOnly({ data }) {
    cy.do([
      addCustomFieldDropdown.choose('Radio button set'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(data.label1),
      MultiColumnListRow({ indexRow: 'row-2' }).find(TextField()).fillIn(data.label2),
    ]);
  },

  fillCustomSingleSelectOnly({ data }) {
    cy.do([
      addCustomFieldDropdown.choose('Single select'),
      fieldLabel.fillIn(data.fieldLabel),
      helpText.fillIn(data.helpText),
      MultiColumnListRow({ indexRow: 'row-1' }).find(TextField()).fillIn(data.firstLabel),
      MultiColumnListRow({ indexRow: 'row-2' }).find(TextField()).fillIn(data.secondLabel),
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
    this.fillCustomTextFieldOnly(data);
    this.saveAndClose();
    this.verifyCustomFieldExists(data.fieldLabel);
  },

  addCustomTextArea(data) {
    this.editButton();
    this.fillCustomTextAreaOnly(data);
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
    this.fillCustomCheckBoxOnly(data);
    this.saveAndClose();
    this.verifyCustomFieldExists(data.fieldLabel);
  },

  addCustomDatePicker(data) {
    this.editButton();
    this.fillCustomDatePickerOnly(data);
    this.saveAndClose();
    this.verifyCustomFieldExists(data.fieldLabel);
  },

  addCustomRadioButton({ data }) {
    this.editButton();
    this.fillCustomRadioButtonOnly({ data });
    this.saveAndClose();
    this.verifyCustomFieldExists(data.fieldLabel);
  },

  addCustomSingleSelect({ data }) {
    this.editButton();
    this.fillCustomSingleSelectOnly({ data });
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

  getCustomFieldsAccordionLabelViaApi(defaultLabel = 'Custom fields') {
    return this.getCustomFieldsConfigViaApi().then((response) => {
      return response?.items?.[0]?.value || defaultLabel;
    });
  },
};
