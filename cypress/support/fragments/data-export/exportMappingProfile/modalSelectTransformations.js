import { including } from '@interactors/html';
import {
  Checkbox,
  Button,
  Modal,
  TextField,
  MultiColumnListRow,
  MultiColumnListCell,
  Pane,
  MultiColumnListHeader,
} from '../../../../../interactors';

const ModalTransformation = Modal('Select transformations');
const instanceRecordTypeChechbox = Checkbox({ value: 'INSTANCE', name: 'filters.recordTypes' });
const holdingsRecordTypeChechbox = Checkbox({ value: 'HOLDINGS', name: 'filters.recordTypes' });
const itemRecordTypeChechbox = Checkbox({ value: 'ITEM', name: 'filters.recordTypes' });
const selectedStatusChechbox = Checkbox({ value: 'selected' });
const unSelectedStatusChechbox = Checkbox({ value: 'unselected' });
const transformationsSearchTextfield = TextField({ name: 'searchValue' });
const resetAllButton = Button('Reset all');
const transformationsSaveAndCloseButton = ModalTransformation.find(Button('Save & close'));

export default {
  searchItemTransformationsByName: (name) => {
    cy.get('div[class^=modal-] input[name=searchValue]').clear().type(`${name}{enter}`);
  },

  selectTransformations: (marcField, subfield) => {
    const cellInteractor = ModalTransformation.find(MultiColumnListRow()).find(
      MultiColumnListCell({ columnIndex: 2 }),
    );

    cy.do(Checkbox({ ariaLabel: 'Select field' }).click());
    cy.then(() => cellInteractor.inputTextFieldNames()).then((inputFieldNames) => {
      cy.do(cellInteractor.find(TextField({ name: inputFieldNames[0] })).fillIn(marcField));
      cy.do(cellInteractor.find(TextField({ name: inputFieldNames[3] })).fillIn(subfield));
      cy.do(ModalTransformation.find(Button('Save & close')).click());
    });
  },

  getSearchResult: (row = 0, col = 0) => MultiColumnListCell({ row, columnIndex: col }),
  clickNthCheckbox(checkBoxNumber = 1) {
    // TODO: redesign with interactors
    cy.get(`div[class^="mclRow--"]:nth-child(${checkBoxNumber}) input[type="checkbox"]`).click();
  },
  verifySearchResultIncludes(allContentToCheck) {
    return allContentToCheck.forEach((contentToCheck) => cy.expect(
      Pane('Transformations')
        .find(MultiColumnListCell({ content: including(contentToCheck) }))
        .exists(),
    ));
  },
  verifySearchResultDoesNotInclude(allContentToCheck) {
    return allContentToCheck.forEach((contentToCheck) => cy.expect(
      Pane('Transformations')
        .find(MultiColumnListCell({ content: including(contentToCheck) }))
        .absent(),
    ));
  },
  verifyAllSearchAndFilterCheckboxesChecked() {
    cy.expect([
      instanceRecordTypeChechbox.has({ checked: true }),
      holdingsRecordTypeChechbox.has({ checked: true }),
      itemRecordTypeChechbox.has({ checked: true }),
      selectedStatusChechbox.has({ checked: true }),
      unSelectedStatusChechbox.has({ checked: true }),
    ]);
  },
  verifyTransformationsPaneColumns() {
    cy.expect([
      Checkbox({ id: 'select-all-checkbox', checked: false }).exists(),
      MultiColumnListHeader('Field name').exists(),
      MultiColumnListHeader('Transformation').exists(),
    ]);
  },
  verifySearchAndFilterPane() {
    this.verifyAllSearchAndFilterCheckboxesChecked();
    this.verifyTransformationsPaneColumns();
  },
  searchText(text) {
    cy.do(transformationsSearchTextfield.fillIn(text));
    cy.get('input[name="searchValue"]').type('{enter}');
  },
  clickResetAll() {
    cy.do(resetAllButton.click());
  },
  uncheckInstanceRecordTypeChechbox() {
    cy.expect(instanceRecordTypeChechbox.has({ checked: true }));
    cy.do(instanceRecordTypeChechbox.click());
  },
  uncheckHoldingsRecordTypeChechbox() {
    cy.expect(holdingsRecordTypeChechbox.has({ checked: true }));
    cy.do(holdingsRecordTypeChechbox.click());
  },
  uncheckItemRecordTypeChechbox() {
    cy.expect(itemRecordTypeChechbox.has({ checked: true }));
    cy.do(itemRecordTypeChechbox.click());
  },
  uncheckSelectedStatusChechbox() {
    cy.expect(selectedStatusChechbox.has({ checked: true }));
    cy.do(selectedStatusChechbox.click());
  },
  uncheckUnselectedStatusChechbox() {
    cy.expect(unSelectedStatusChechbox.has({ checked: true }));
    cy.do(unSelectedStatusChechbox.click());
  },
  checkInstanceRecordTypeChechbox() {
    cy.expect(instanceRecordTypeChechbox.has({ checked: false }));
    cy.do(instanceRecordTypeChechbox.click());
  },
  checkHoldingsRecordTypeChechbox() {
    cy.expect(holdingsRecordTypeChechbox.has({ checked: false }));
    cy.do(holdingsRecordTypeChechbox.click());
  },
  checkItemRecordTypeChechbox() {
    cy.expect(itemRecordTypeChechbox.has({ checked: false }));
    cy.do(itemRecordTypeChechbox.click());
  },
  checkSelectedStatusChechbox() {
    cy.expect(selectedStatusChechbox.has({ checked: false }));
    cy.do(selectedStatusChechbox.click());
  },
  checkUnselectedStatusChechbox() {
    cy.expect(unSelectedStatusChechbox.has({ checked: false }));
    cy.do(unSelectedStatusChechbox.click());
  },
  verifyCheckboxDisabled(name) {
    cy.expect(Checkbox(name).has({ disabled: true }));
  },
  verifyTotalSelected(expectedTotalSelected) {
    cy.expect(
      Modal('Select transformations').has({
        content: including(`Total selected: ${expectedTotalSelected}`),
      }),
    );
  },
  fillInTransformationsTextfields(textfield1, textfield2, textfield3, textfield4, rowIndex = 0) {
    // TODO: redesign with interactors
    cy.xpath(
      `//div[contains(@class, "mclRow--")][${rowIndex + 1}]//input[contains(@name, "marcField")]`,
    ).type(textfield1);
    cy.xpath(
      `//div[contains(@class, "mclRow--")][${rowIndex + 1}]//input[contains(@name, "indicator1")]`,
    ).type(textfield2);
    cy.xpath(
      `//div[contains(@class, "mclRow--")][${rowIndex + 1}]//input[contains(@name, "indicator2")]`,
    ).type(textfield3);
    cy.xpath(
      `//div[contains(@class, "mclRow--")][${rowIndex + 1}]//input[contains(@name, "subfield")]`,
    ).type(textfield4);
  },
  clickTransformationsSaveAndCloseButton() {
    cy.do(transformationsSaveAndCloseButton.click());
  },
};
