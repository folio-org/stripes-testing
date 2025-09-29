import {
  Pane,
  MultiSelect,
  TextField,
  TextArea,
  Select,
  Checkbox,
  Accordion,
  HTML,
  including,
} from '../../../../../../interactors';
import BulkEditProfileForm from './bulkEditProfileForm';

const newProfilePane = Pane('New FOLIO instances bulk edit profile');
const newMarcProfilePane = Pane('New instances with source MARC bulk edit profile');
const statisticalCodeSelect = MultiSelect({ label: 'Statistical code select' });
const bulkEditForMarcInstancesAccordion = Accordion('Bulk edits for instances with source MARC');
const tagField = TextField({ name: 'tag' });
const ind1Field = TextField({ name: 'ind1' });
const ind2Field = TextField({ name: 'ind2' });
const subField = TextField({ name: 'subfield' });
const dataField = TextArea({ ariaLabel: 'Data' });
const selectActionForMarcInstanceDropdown = Select({ name: 'name', required: true });

export default {
  ...BulkEditProfileForm,

  waitLoading() {
    cy.expect(newProfilePane.exists());
  },

  waitLoadingMarcProfile() {
    cy.expect(newMarcProfilePane.exists());
  },

  verifyNewProfilePaneAbsent() {
    cy.expect(newProfilePane.absent());
  },

  verifyMarcProfilePaneAbsent() {
    cy.expect(newMarcProfilePane.absent());
  },

  verifyBulkEditForMarcInstancesAccordionExists() {
    cy.expect(newMarcProfilePane.find(bulkEditForMarcInstancesAccordion).has({ open: true }));
  },

  verifyBulkEditForMarcInstancesAccordionElements() {
    cy.expect([
      bulkEditForMarcInstancesAccordion
        .find(HTML({ className: including('headerCell'), text: including('Field\n*') }))
        .find(HTML({ className: including('icon-info') }))
        .exists(),
      bulkEditForMarcInstancesAccordion
        .find(HTML({ className: including('headerCell'), text: 'In.1\n*' }))
        .exists(),
      bulkEditForMarcInstancesAccordion
        .find(HTML({ className: including('headerCell'), text: 'In.2\n*' }))
        .exists(),
      bulkEditForMarcInstancesAccordion
        .find(HTML({ className: including('headerCell'), text: 'Subfield\n*' }))
        .exists(),
      bulkEditForMarcInstancesAccordion
        .find(HTML({ className: including('headerCell'), text: 'Actions\n*' }))
        .exists(),
      bulkEditForMarcInstancesAccordion.find(this.getTargetRow(0)).find(tagField).exists(),
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(0))
        .find(ind1Field)
        .has({ value: '\\' }),
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(0))
        .find(ind2Field)
        .has({ value: '\\' }),
      bulkEditForMarcInstancesAccordion.find(this.getTargetRow(0)).find(subField).exists(),
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(0))
        .find(selectActionForMarcInstanceDropdown)
        .exists(),
      bulkEditForMarcInstancesAccordion.find(this.plusButton).has({ disabled: false }),
      bulkEditForMarcInstancesAccordion.find(this.garbageCanButton).has({ disabled: true }),
    ]);
  },

  verifyApplyToCheckboxes(isChecked = true) {
    cy.expect([
      this.bulkEditsAccordion
        .find(Checkbox('Apply to all holdings records'))
        .has({ checked: isChecked }),
      this.bulkEditsAccordion
        .find(Checkbox('Apply to all items records'))
        .has({ checked: isChecked }),
    ]);
  },

  fillInTagAndIndicatorsAndSubfield(tag, ind1, ind2, subfield, rowIndex = 0) {
    cy.do([
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(tagField)
        .fillIn(tag),
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(ind1Field)
        .fillIn(ind1),
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(ind2Field)
        .fillIn(ind2),
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(subField)
        .fillIn(subfield),
    ]);
  },

  selectMarcAction(action, rowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(Select({ dataActionIndex: '0' }))
        .choose(action),
    );
  },

  selectSecondMarcAction(action, rowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(Select({ dataActionIndex: '1' }))
        .choose(action),
    );
  },

  fillInDataTextAreaForMarcInstance(value, rowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(dataField)
        .fillIn(value),
    );
    cy.expect(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(dataField)
        .has({ value }),
    );
  },

  fillInSubfieldInSubRow(value, rowIndex = 0, subRowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion.find(this.getTargetRow(rowIndex)).perform((rowEl) => {
        cy.wrap(rowEl)
          .find('[class*="subRow-"]')
          .eq(subRowIndex)
          .find('input[name="subfield"]')
          .clear()
          .type(value);
      }),
    );
  },

  fillInDataInSubRow(value, rowIndex = 0, subRowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion.find(this.getTargetRow(rowIndex)).perform((rowEl) => {
        cy.wrap(rowEl)
          .find('[class*="subRow-"]')
          .eq(subRowIndex)
          .find('textarea[name="value"]')
          .clear()
          .type(value);
      }),
    );
  },

  selectStatisticalCode(statisticalCode, rowIndex = 0) {
    cy.do(this.getTargetRow(rowIndex).find(statisticalCodeSelect).select(statisticalCode));
  },

  verifyStatisticalCodeSelected(statisticalCode, rowIndex = 0) {
    cy.expect(
      this.getTargetRow(rowIndex)
        .find(statisticalCodeSelect)
        .has({ selected: [statisticalCode] }),
    );
  },
};
