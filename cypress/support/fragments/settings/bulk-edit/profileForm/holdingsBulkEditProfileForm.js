import { Pane, Checkbox, or } from '../../../../../../interactors';
import { BULK_EDIT_ACTIONS, HOLDING_NOTE_TYPES } from '../../../../constants';
import BulkEditProfileForm from './bulkEditProfileForm';

const newProfilePane = Pane('New holdings bulk edit profile');

export default {
  ...BulkEditProfileForm,

  waitLoading() {
    cy.expect(newProfilePane.exists());
  },

  verifyNewProfilePaneAbsent() {
    cy.expect(newProfilePane.absent());
  },

  verifyApplyToCheckbox(isChecked = true, rowIndex = 0) {
    cy.expect(
      this.bulkEditsAccordion
        .find(this.getTargetRow(rowIndex))
        .find(Checkbox('Apply to all items records'))
        .has({ checked: isChecked }),
    );
  },

  verifyAvailableOptionsAndActions(rowIndex = 0) {
    const findActions = [BULK_EDIT_ACTIONS.FIND, BULK_EDIT_ACTIONS.FIND_FULL_FIELD_SEARCH];
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
        option: 'Suppress from discovery',
        actions: [BULK_EDIT_ACTIONS.SET_FALSE, BULK_EDIT_ACTIONS.SET_TRUE],
      },
      // Electronic access
      {
        option: 'Link text',
        actions: [
          BULK_EDIT_ACTIONS.CLEAR_FIELD,
          BULK_EDIT_ACTIONS.FIND,
          BULK_EDIT_ACTIONS.REPLACE_WITH,
        ],
      },
      {
        option: 'Material specified',
        actions: [
          BULK_EDIT_ACTIONS.CLEAR_FIELD,
          BULK_EDIT_ACTIONS.FIND,
          BULK_EDIT_ACTIONS.REPLACE_WITH,
        ],
      },
      {
        option: 'URI',
        actions: [
          BULK_EDIT_ACTIONS.CLEAR_FIELD,
          BULK_EDIT_ACTIONS.FIND,
          BULK_EDIT_ACTIONS.REPLACE_WITH,
        ],
      },
      {
        option: 'URL public note',
        actions: [
          BULK_EDIT_ACTIONS.CLEAR_FIELD,
          BULK_EDIT_ACTIONS.FIND,
          BULK_EDIT_ACTIONS.REPLACE_WITH,
        ],
      },
      {
        option: 'URL relationship',
        actions: [
          BULK_EDIT_ACTIONS.CLEAR_FIELD,
          BULK_EDIT_ACTIONS.FIND_FULL_FIELD_SEARCH,
          BULK_EDIT_ACTIONS.REPLACE_WITH,
        ],
      },
      // Holdings notes
      {
        option: HOLDING_NOTE_TYPES.COPY_NOTE,
        actions: [
          BULK_EDIT_ACTIONS.ADD_NOTE,
          BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
          BULK_EDIT_ACTIONS.FIND,
          BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
          BULK_EDIT_ACTIONS.REMOVE_ALL,
          BULK_EDIT_ACTIONS.REMOVE_MARK_AS_STAFF_ONLY,
        ],
      },
      // Location
      {
        option: 'Permanent holdings location',
        actions: [BULK_EDIT_ACTIONS.REPLACE_WITH],
      },
      {
        option: 'Temporary holdings location',
        actions: [BULK_EDIT_ACTIONS.CLEAR_FIELD, BULK_EDIT_ACTIONS.REPLACE_WITH],
      },
    ];

    availableOptionsAndActions.forEach((optionAndActions) => {
      this.selectOption(optionAndActions.option, rowIndex);

      cy.expect(
        this.getTargetRow(rowIndex)
          .find(this.actionsDropdown)
          .has({ optionsText: optionAndActions.actions }),
      );

      // Verify second actions dropdown for 'Find' action
      const foundFindAction = findActions.find((action) => {
        return optionAndActions.actions.includes(action);
      });

      if (foundFindAction) {
        this.selectAction(foundFindAction, rowIndex);
        cy.expect(
          this.getTargetRow(rowIndex)
            .find(this.secondActionsDropdown)
            .has({ optionsText: [BULK_EDIT_ACTIONS.REMOVE, BULK_EDIT_ACTIONS.REPLACE_WITH] }),
        );
      }

      if (optionAndActions.option === 'Suppress from discovery') {
        optionAndActions.actions.forEach((action) => {
          this.selectAction(action, rowIndex);
          this.verifyApplyToCheckbox(or(false, true), rowIndex);
        });
      }
    });
  },
};
