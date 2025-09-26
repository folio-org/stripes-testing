import { Pane, Select } from '../../../../../../interactors';
import { BULK_EDIT_ACTIONS } from '../../../../constants';
import BulkEditProfileForm from './bulkEditProfileForm';

const newProfilePane = Pane('New items bulk edit profile');

export default {
  ...BulkEditProfileForm,

  waitLoading() {
    cy.expect(newProfilePane.exists());
  },

  verifyNewProfilePaneAbsent() {
    cy.expect(newProfilePane.absent());
  },

  selectItemStatus(status) {
    cy.do(Select('Status select').choose(status));
  },

  verifyAvailableOptionsAndActions(rowIndex = 0) {
    const availableOptionsAndActions = [
      // Administrative data
      {
        option: 'Administrative note',
        actions: {
          firstDropdownActions: [
            BULK_EDIT_ACTIONS.ADD_NOTE,
            BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
            BULK_EDIT_ACTIONS.FIND,
            BULK_EDIT_ACTIONS.REMOVE_ALL,
          ],
          secondDropdownActions: [BULK_EDIT_ACTIONS.REMOVE, BULK_EDIT_ACTIONS.REPLACE_WITH],
        },
      },
      {
        option: 'Suppress from discovery',
        actions: {
          firstDropdownActions: [BULK_EDIT_ACTIONS.SET_FALSE, BULK_EDIT_ACTIONS.SET_TRUE],
          secondDropdownActions: [],
        },
      },
      // Item notes
      {
        option: 'Action note',
        actions: {
          firstDropdownActions: [
            BULK_EDIT_ACTIONS.ADD_NOTE,
            BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
            BULK_EDIT_ACTIONS.FIND,
            BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
            BULK_EDIT_ACTIONS.REMOVE_ALL,
            BULK_EDIT_ACTIONS.REMOVE_MARK_AS_STAFF_ONLY,
          ],
          secondDropdownActions: [BULK_EDIT_ACTIONS.REMOVE, BULK_EDIT_ACTIONS.REPLACE_WITH],
        },
      },
      // Loan and availability
      {
        option: 'Check in note',
        actions: {
          firstDropdownActions: [
            BULK_EDIT_ACTIONS.ADD_NOTE,
            BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
            BULK_EDIT_ACTIONS.DUPLICATE_TO,
            BULK_EDIT_ACTIONS.FIND,
            BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
            BULK_EDIT_ACTIONS.REMOVE_ALL,
            BULK_EDIT_ACTIONS.REMOVE_MARK_AS_STAFF_ONLY,
          ],
          secondDropdownActions: [BULK_EDIT_ACTIONS.REMOVE, BULK_EDIT_ACTIONS.REPLACE_WITH],
        },
      },
      {
        option: 'Check out note',
        actions: {
          firstDropdownActions: [
            BULK_EDIT_ACTIONS.ADD_NOTE,
            BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
            BULK_EDIT_ACTIONS.DUPLICATE_TO,
            BULK_EDIT_ACTIONS.FIND,
            BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
            BULK_EDIT_ACTIONS.REMOVE_ALL,
            BULK_EDIT_ACTIONS.REMOVE_MARK_AS_STAFF_ONLY,
          ],
          secondDropdownActions: ['Remove', 'Replace with'],
        },
      },
      {
        option: 'Item status',
        actions: {
          firstDropdownActions: [BULK_EDIT_ACTIONS.REPLACE_WITH],
          secondDropdownActions: [],
        },
      },
      {
        option: 'Permanent loan type',
        actions: {
          firstDropdownActions: [BULK_EDIT_ACTIONS.REPLACE_WITH],
          secondDropdownActions: [],
        },
      },
      {
        option: 'Temporary loan type',
        actions: {
          firstDropdownActions: [BULK_EDIT_ACTIONS.CLEAR_FIELD, BULK_EDIT_ACTIONS.REPLACE_WITH],
          secondDropdownActions: [],
        },
      },
      // Location
      {
        option: 'Permanent item location',
        actions: {
          firstDropdownActions: [BULK_EDIT_ACTIONS.CLEAR_FIELD, BULK_EDIT_ACTIONS.REPLACE_WITH],
          secondDropdownActions: [],
        },
      },
      {
        option: 'Temporary item location',
        actions: {
          firstDropdownActions: [BULK_EDIT_ACTIONS.CLEAR_FIELD, BULK_EDIT_ACTIONS.REPLACE_WITH],
          secondDropdownActions: [],
        },
      },
    ];

    availableOptionsAndActions.forEach((optionAndActions) => {
      this.selectOption(optionAndActions.option, rowIndex);

      cy.expect(
        this.getTargetRow(rowIndex)
          .find(this.actionsDropdown)
          .has({ optionsText: optionAndActions.actions.firstDropdownActions }),
      );

      if (optionAndActions.actions.firstDropdownActions.includes('Find')) {
        this.selectAction('Find', rowIndex);
        cy.expect(
          this.getTargetRow(rowIndex)
            .find(this.secondActionsDropdown)
            .has({ optionsText: optionAndActions.actions.secondDropdownActions }),
        );
      }
    });
  },
};
