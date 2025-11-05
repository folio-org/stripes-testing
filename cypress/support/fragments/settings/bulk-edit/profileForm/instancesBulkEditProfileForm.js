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
  or,
} from '../../../../../../interactors';
import { BULK_EDIT_ACTIONS, INSTANCE_NOTE_TYPES } from '../../../../constants';
import BulkEditProfileForm from './bulkEditProfileForm';

const newProfilePane = Pane('New FOLIO instances bulk edit profile');
const newMarcProfilePane = Pane('New instances with source MARC bulk edit profile');
const statisticalCodeSelect = MultiSelect({ label: 'Statistical code select' });
const bulkEditForMarcInstancesAccordion = Accordion('Bulk edits for instances with source MARC');
const tagField = TextField({ name: 'tag' });
const ind1Field = TextField({ name: 'ind1' });
const ind2Field = TextField({ name: 'ind2' });
const subField = TextField({ name: 'subfield' });
const dataField = TextArea({ ariaLabel: 'Data', dataActionIndex: '0' });
const secondDataField = TextArea({ ariaLabel: 'Data', dataActionIndex: '1' });
const selectActionForMarcInstanceDropdown = Select({ dataActionIndex: '0', required: true });
const selectSecondActionForMarcInstanceDropdown = Select({ dataActionIndex: '1' });

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

  verifyNewMarcProfilePaneAbsent() {
    cy.expect(newMarcProfilePane.absent());
  },

  verifyBulkEditForMarcInstancesAccordionExists() {
    cy.expect(bulkEditForMarcInstancesAccordion.has({ open: true }));
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

  verifyApplyToCheckboxes(isChecked = true, rowIndex = 0) {
    cy.expect([
      this.bulkEditsAccordion
        .find(this.getTargetRow(rowIndex))
        .find(Checkbox('Apply to all holdings records'))
        .has({ checked: isChecked }),
      this.bulkEditsAccordion
        .find(this.getTargetRow(rowIndex))
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

  selectMarcAction(action, rowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(selectActionForMarcInstanceDropdown)
        .choose(action),
    );
  },

  verifySelectedMarcAction(action, rowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(selectActionForMarcInstanceDropdown)
        .has({ checkedOptionText: action }),
    );
  },

  selectSecondMarcAction(action, rowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(selectSecondActionForMarcInstanceDropdown)
        .choose(action),
    );
  },

  verifySelectedSecondMarcAction(action, rowIndex = 0) {
    cy.expect(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(selectSecondActionForMarcInstanceDropdown)
        .has({ checkedOptionText: action }),
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

  verifyDataTextAreaForMarcInstance(value, rowIndex = 0) {
    cy.expect(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(dataField)
        .has({ value }),
    );
  },

  fillInSecondDataTextAreaForMarcInstance(value, rowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(secondDataField)
        .fillIn(value),
    );
  },

  verifySecondDataTextAreaForMarcInstance(value, rowIndex = 0) {
    cy.expect(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(secondDataField)
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

  verifyAvailableOptionsAndActions(rowIndex = 0) {
    const availableOptionsAndActions = [
      // Administrative data
      {
        option: 'Administrative note',
        actions: [
          BULK_EDIT_ACTIONS.ADD_NOTE,
          BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
          BULK_EDIT_ACTIONS.FIND,
          BULK_EDIT_ACTIONS.REMOVE_ALL,
        ],
      },
      {
        option: 'Set records for deletion',
        actions: [BULK_EDIT_ACTIONS.SET_FALSE, BULK_EDIT_ACTIONS.SET_TRUE],
      },
      {
        option: 'Staff suppress',
        actions: [BULK_EDIT_ACTIONS.SET_FALSE, BULK_EDIT_ACTIONS.SET_TRUE],
      },
      {
        option: 'Statistical code',
        actions: [BULK_EDIT_ACTIONS.ADD, BULK_EDIT_ACTIONS.REMOVE, BULK_EDIT_ACTIONS.REMOVE_ALL],
      },
      {
        option: 'Suppress from discovery',
        actions: [BULK_EDIT_ACTIONS.SET_FALSE, BULK_EDIT_ACTIONS.SET_TRUE],
      },
      // Instance notes
      {
        option: INSTANCE_NOTE_TYPES.DATA_QUALITY_NOTE,
        actions: [
          BULK_EDIT_ACTIONS.ADD_NOTE,
          BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
          BULK_EDIT_ACTIONS.FIND,
          BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
          BULK_EDIT_ACTIONS.REMOVE_ALL,
          BULK_EDIT_ACTIONS.REMOVE_MARK_AS_STAFF_ONLY,
        ],
      },
    ];

    availableOptionsAndActions.forEach((optionAndActions) => {
      this.selectOption(optionAndActions.option, rowIndex);

      cy.expect(
        this.bulkEditsAccordion
          .find(this.getTargetRow(rowIndex))
          .find(this.actionsDropdown)
          .has({ optionsText: optionAndActions.actions }),
      );

      if (optionAndActions.actions.includes(BULK_EDIT_ACTIONS.FIND)) {
        this.selectAction(BULK_EDIT_ACTIONS.FIND, rowIndex);
        cy.expect(
          this.bulkEditsAccordion
            .find(this.getTargetRow(rowIndex))
            .find(this.secondActionsDropdown)
            .has({ optionsText: [BULK_EDIT_ACTIONS.REMOVE, BULK_EDIT_ACTIONS.REPLACE_WITH] }),
        );
      }

      if (optionAndActions.option === 'Suppress from discovery') {
        optionAndActions.actions.forEach((action) => {
          this.selectAction(action, rowIndex);
          this.verifyApplyToCheckboxes(or(false, true), rowIndex);
        });
      }
    });
  },

  verifyAvailableOptionsAndActionsForMarcInstance(rowIndex = 0) {
    const availableOptionsAndActions = [
      {
        option: 'Administrative note',
        actions: [BULK_EDIT_ACTIONS.ADD_NOTE, BULK_EDIT_ACTIONS.FIND, BULK_EDIT_ACTIONS.REMOVE_ALL],
      },
      {
        option: 'Set records for deletion',
        actions: [BULK_EDIT_ACTIONS.SET_FALSE, BULK_EDIT_ACTIONS.SET_TRUE],
      },
      {
        option: 'Staff suppress',
        actions: [BULK_EDIT_ACTIONS.SET_FALSE, BULK_EDIT_ACTIONS.SET_TRUE],
      },
      {
        option: 'Statistical code',
        actions: [BULK_EDIT_ACTIONS.ADD, BULK_EDIT_ACTIONS.REMOVE, BULK_EDIT_ACTIONS.REMOVE_ALL],
      },
      {
        option: 'Suppress from discovery',
        actions: [BULK_EDIT_ACTIONS.SET_FALSE, BULK_EDIT_ACTIONS.SET_TRUE],
      },
    ];

    availableOptionsAndActions.forEach((optionAndActions) => {
      this.selectOption(optionAndActions.option, rowIndex);

      cy.expect(
        this.bulkEditsAccordion
          .find(this.getTargetRow(rowIndex))
          .find(this.actionsDropdown)
          .has({ optionsText: optionAndActions.actions }),
      );

      if (optionAndActions.actions.includes(BULK_EDIT_ACTIONS.FIND)) {
        this.selectAction(BULK_EDIT_ACTIONS.FIND, rowIndex);
        cy.expect(
          this.bulkEditsAccordion
            .find(this.getTargetRow(rowIndex))
            .find(this.secondActionsDropdown)
            .has({ optionsText: [BULK_EDIT_ACTIONS.REMOVE, BULK_EDIT_ACTIONS.REPLACE_WITH] }),
        );
      }

      if (optionAndActions.option === 'Suppress from discovery') {
        optionAndActions.actions.forEach((action) => {
          this.selectAction(action, rowIndex);
          this.verifyApplyToCheckboxes(or(false, true), rowIndex);
        });
      }
    });
  },

  verifyMarcActionsAvailable(rowIndex = 0) {
    const availableMarcActions = [
      BULK_EDIT_ACTIONS.ADD,
      BULK_EDIT_ACTIONS.FIND,
      BULK_EDIT_ACTIONS.REMOVE_ALL,
    ];

    cy.expect(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(selectActionForMarcInstanceDropdown)
        .has({ optionsText: availableMarcActions }),
    );

    const availableMarcActionsInSecondDropdown = [
      BULK_EDIT_ACTIONS.APPEND,
      BULK_EDIT_ACTIONS.REMOVE_FIELD,
      BULK_EDIT_ACTIONS.REMOVE_SUBFIELD,
      BULK_EDIT_ACTIONS.REPLACE_WITH,
    ];

    this.selectMarcAction(BULK_EDIT_ACTIONS.FIND, rowIndex);
    cy.expect(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(selectSecondActionForMarcInstanceDropdown)
        .has({ optionsText: availableMarcActionsInSecondDropdown }),
    );
  },

  clickGarbageCanButtonInMarcInstancesAccordion(rowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(this.garbageCanButton)
        .click(),
    );
  },

  clickPlusButtonInMarcInstancesAccordion(rowIndex = 0) {
    cy.do(
      bulkEditForMarcInstancesAccordion
        .find(this.getTargetRow(rowIndex))
        .find(this.plusButton)
        .click(),
    );
  },
};
