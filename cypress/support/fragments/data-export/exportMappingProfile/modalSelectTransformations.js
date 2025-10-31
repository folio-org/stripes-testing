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
const transformationsCancelButton = ModalTransformation.find(Button('Cancel'));
const getTargetFieldRow = (fieldName) => {
  return ModalTransformation.find(MultiColumnListRow({ innerHTML: including(fieldName) }));
};

export default {
  searchItemTransformationsByName: (name) => {
    cy.get('div[class^=modal-] input[name=searchValue]').clear().type(`${name}{enter}`);
  },

  verifyValueInSearchField(searchValue) {
    cy.expect(TextField({ name: 'searchValue' }).has({ value: searchValue }));
  },

  selectTransformations: (marcField, subfield) => {
    cy.do([
      Checkbox({ ariaLabel: 'Select field' }).click(),
      ModalTransformation.find(MultiColumnListRow())
        .find(TextField({ name: including('marcField') }))
        .fillIn(marcField),
      ModalTransformation.find(MultiColumnListRow())
        .find(TextField({ name: including('subfield') }))
        .fillIn(subfield),
      ModalTransformation.find(Button('Save & close')).click(),
    ]);
  },

  getSearchResult: (row = 0, col = 0) => MultiColumnListCell({ row, columnIndex: col }),
  clickNthCheckbox(checkBoxNumber = 1) {
    // TODO: redesign with interactors
    cy.get(`div[class^="mclRow--"]:nth-child(${checkBoxNumber}) input[type="checkbox"]`).click();
  },

  verifySearchResultIncludes(allContentToCheck) {
    return allContentToCheck.forEach((contentToCheck) => {
      cy.expect(
        Pane('Transformations')
          .find(MultiColumnListCell({ content: including(contentToCheck) }))
          .exists(),
      );
    });
  },

  verifySearchResultDoesNotInclude(allContentToCheck) {
    return allContentToCheck.forEach((contentToCheck) => {
      cy.expect(
        Pane('Transformations')
          .find(MultiColumnListCell({ content: including(contentToCheck) }))
          .absent(),
      );
    });
  },

  verifyTransformationFieldsFilteredByRecordType(recordType) {
    const selector =
      '#mapping-profiles-form-transformations [role="row"] [class*="mclCell"]:nth-child(2)';
    const scrollableContainer = '#mapping-profiles-form-transformations div [style*=transform]';
    const allFieldNames = [];

    // Function to collect visible field names
    const collectVisibleFieldNames = () => {
      cy.get(selector).then(($cells) => {
        $cells.each((i, cell) => {
          const fieldName = cell.textContent.trim();
          // Only add unique field names
          if (!allFieldNames.includes(fieldName)) {
            allFieldNames.push(fieldName);
          }
        });
      });
    };

    // Get scroll container info and scroll incrementally
    cy.get(scrollableContainer)
      .then(($container) => {
        const container = $container[0];
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const scrollStep = clientHeight * 0.8; // Scroll 80% of viewport height at a time
        const scrollSteps = Math.ceil(scrollHeight / scrollStep);

        // Collect from initial position
        collectVisibleFieldNames();

        // Scroll down incrementally and collect
        for (let i = 1; i <= scrollSteps; i++) {
          cy.get(scrollableContainer).scrollTo(0, i * scrollStep);
          cy.wait(200);
          collectVisibleFieldNames();
        }
      })
      .then(() => {
        cy.expect(
          Pane('Transformations').has({ subtitle: `${allFieldNames.length} fields found` }),
        );

        allFieldNames.forEach((fieldName) => {
          expect(fieldName).to.match(new RegExp(`^${recordType}`));
        });
      });
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
      MultiColumnListHeader('Field').exists(),
      MultiColumnListHeader('In.1').exists(),
      MultiColumnListHeader('In.2').exists(),
      MultiColumnListHeader('Subfield').exists(),
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

  fillInTransformationsTextfieldsByFieldName(fieldName, marcField, ind1, ind2, subfield) {
    const targetFieldRow = getTargetFieldRow(fieldName);

    cy.do([
      targetFieldRow.find(TextField({ name: including('marcField') })).fillIn(marcField),
      targetFieldRow.find(TextField({ name: including('indicator1') })).fillIn(ind1),
      targetFieldRow.find(TextField({ name: including('indicator2') })).fillIn(ind2),
      targetFieldRow.find(TextField({ name: including('subfield') })).fillIn(subfield),
    ]);
  },

  verifyTransformationsTextfieldsByFieldName(fieldName, marcField, ind1, ind2, subfield) {
    const targetFieldRow = getTargetFieldRow(fieldName);

    cy.do([
      targetFieldRow.find(TextField({ name: including('marcField') })).has({ value: marcField }),
      targetFieldRow.find(TextField({ name: including('indicator1') })).has({ value: ind1 }),
      targetFieldRow.find(TextField({ name: including('indicator2') })).has({ value: ind2 }),
      targetFieldRow.find(TextField({ name: including('subfield') })).has({ value: subfield }),
    ]);
  },

  typeInTransformationsMarcTextField(textfield1, rowIndex = 0) {
    cy.xpath(
      `//div[contains(@class, "mclRow--")][${rowIndex + 1}]//input[contains(@name, "marcField")]`,
    )
      .clear()
      .type(textfield1);
  },

  typeInSubfieldTextField(subfieldValue, rowIndex = 0) {
    cy.xpath(
      `//div[contains(@class, "mclRow--")][${rowIndex + 1}]//input[contains(@name, "subfield")]`,
    ).type(subfieldValue);
  },

  verifyValueInField(fieldName, field, fieldValue) {
    cy.expect(
      ModalTransformation.find(MultiColumnListRow({ ariaLabel: fieldName }))
        .find(TextField({ name: including(`.${field}`) }))
        .has({ value: fieldValue }),
    );
  },

  removeValueFromTransformationsMarcTextField(rowIndex = 0) {
    cy.do(
      ModalTransformation.find(
        TextField({ name: `transformations[${rowIndex}].rawTransformation.marcField` }),
      )
        .find(Button({ ariaLabel: 'Clear this field' }))
        .click(),
    );
  },

  clickTransformationsSaveAndCloseButton() {
    cy.do(transformationsSaveAndCloseButton.click());
  },

  verifySaveAndCloseButtonDisabled() {
    cy.expect(transformationsSaveAndCloseButton.has({ disabled: true }));
  },

  clickTransformationsCancelButton() {
    cy.do(transformationsCancelButton.click());
  },

  clickKeepEditingBtn() {
    cy.do(Modal('Are you sure?').find(Button('Keep Editing')).click());
  },

  verifyTransformationsFirstRowTextFieldsPlaceholders(
    textfield1,
    textfield2,
    textfield3,
    textfield4,
  ) {
    cy.expect([
      ModalTransformation.find(
        TextField({ name: 'transformations[0].rawTransformation.marcField' }),
      ).has({ placeholder: textfield1 }),
      ModalTransformation.find(
        TextField({ name: 'transformations[0].rawTransformation.indicator1' }),
      ).has({ placeholder: textfield2 }),
      ModalTransformation.find(
        TextField({ name: 'transformations[0].rawTransformation.indicator2' }),
      ).has({ placeholder: textfield3 }),
      ModalTransformation.find(
        TextField({ name: 'transformations[0].rawTransformation.subfield' }),
      ).has({ placeholder: textfield4 }),
    ]);
  },

  verifyTransformationsFirstRowTextFieldsValues(textfield1, textfield2, textfield3, textfield4) {
    cy.expect([
      ModalTransformation.find(
        TextField({ name: 'transformations[0].rawTransformation.marcField' }),
      ).has({ value: textfield1 }),
      ModalTransformation.find(
        TextField({ name: 'transformations[0].rawTransformation.indicator1' }),
      ).has({ value: textfield2 }),
      ModalTransformation.find(
        TextField({ name: 'transformations[0].rawTransformation.indicator2' }),
      ).has({ value: textfield3 }),
      ModalTransformation.find(
        TextField({ name: 'transformations[0].rawTransformation.subfield' }),
      ).has({ value: textfield4 }),
    ]);
  },

  verifyFieldHasError(field) {
    cy.expect(
      ModalTransformation.find(TextField({ name: including(`.rawTransformation.${field}`) })).has({
        errorBorder: true,
      }),
    );
    cy.get(`div[data-testid="transformation-field-group-${field}"]`)
      .find('button')
      .should('have.attr', 'data-testid', 'transformation-invalid');
  },

  clickErrorIconForFieldAndVerifyPopover(field) {
    cy.get(`div[data-testid="transformation-field-group-${field}"]`).find('button').click();
    cy.wait(500);
    cy.get('div[data-role="popover"]').within(() => {
      cy.contains('Please check your input').should('be.visible');
    });
  },

  verifyModalTransformationExists(isExist = true) {
    if (isExist) cy.expect(ModalTransformation.exists());
    cy.expect(ModalTransformation.absent());
  },

  verifyFieldSelectedForTransformationByName(fieldName, rowIndex = 0) {
    cy.expect(
      ModalTransformation.find(MultiColumnListRow({ ariaLabel: fieldName }))
        .find(Checkbox({ name: `transformations[${rowIndex}].isSelected` }))
        .has({ checked: true }),
    );
  },
};
