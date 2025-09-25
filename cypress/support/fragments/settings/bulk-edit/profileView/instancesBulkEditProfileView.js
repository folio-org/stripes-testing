import BulkEditProfileView from './bulkEditProfileView';
import {
  MultiSelect,
  Accordion,
  Checkbox,
  TextField,
  TextArea,
  Select,
} from '../../../../../../interactors';

const bulkEditForMarcInstancesAccordion = Accordion('Bulk edits for instances with source MARC');
const tagField = TextField({ name: 'tag' });
const ind1Field = TextField({ name: 'ind1' });
const ind2Field = TextField({ name: 'ind2' });

export default {
  ...BulkEditProfileView,

  verifyTagAndIndicatorsAndSubfieldValues(tag, ind1, ind2, subfield, rowIndex = 0) {
    cy.expect([
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(tagField)
        .has({ value: tag }),
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(ind1Field)
        .has({ value: ind1 }),
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(ind2Field)
        .has({ value: ind2 }),
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(TextField({ value: subfield }))
        .exists(),
    ]);
  },

  verifyDataTextAreaForMarcInstance(value, rowIndex = 0) {
    cy.expect(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(TextArea({ ariaLabel: 'Data', textContent: value }))
        .exists(),
    );
  },

  verifySelectedMarcAction(action, rowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(Select({ dataActionIndex: '0', checkedOptionText: action }))
        .exists(),
    );
  },

  verifySelectedSecondMarcAction(action, rowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(Select({ dataActionIndex: '1', checkedOptionText: action }))
        .exists(),
    );
  },

  verifySubfieldInSubRow(value, rowIndex = 0, subRowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion.find(this.getTargetRow(rowIndex)).perform((rowEl) => {
        cy.wrap(rowEl)
          .find('[class*="subRow-"]')
          .eq(subRowIndex)
          .find('input[name="subfield"]')
          .should('have.value', value);
      }),
    );
  },

  verifySelectedActionInSubRow(value, rowIndex = 0, subRowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion.find(this.getTargetRow(rowIndex)).perform((rowEl) => {
        cy.wrap(rowEl)
          .find('[class*="subRow-"]')
          .eq(subRowIndex)
          .find('select[data-action-index="0"]')
          .should('have.text', value);
      }),
    );
  },

  verifyDataTextAreaInSubRow(value, rowIndex = 0, subRowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion.find(this.getTargetRow(rowIndex)).perform((rowEl) => {
        cy.wrap(rowEl)
          .find('[class*="subRow-"]')
          .eq(subRowIndex)
          .find('textarea[aria-label="Data"]')
          .should('have.text', value);
      }),
    );
  },

  verifySelectedStatisticalCode(statisticalCode, rowIndex = 0) {
    cy.expect(
      this.getTargetRow(rowIndex)
        .find(MultiSelect({ label: 'Statistical code select' }))
        .has({ selected: [statisticalCode] }),
    );
  },

  verifyApplyToCheckboxes(isChecked = true, rowIndex = 0) {
    cy.expect([
      this.bulkEditsAccordion
        .find(this.getTargetRow(rowIndex))
        .find(Checkbox('Apply to all holdings records'))
        .has({ checked: isChecked, disabled: true }),
      this.bulkEditsAccordion
        .find(this.getTargetRow(rowIndex))
        .find(Checkbox('Apply to all items records'))
        .has({ checked: true, disabled: true }),
    ]);
  },
};
