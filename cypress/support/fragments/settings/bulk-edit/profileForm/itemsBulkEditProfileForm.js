import { Pane, Select, some, SelectionList, Button } from '../../../../../../interactors';
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
      // Item notes
      {
        option: 'Action note',
        actions: [
          BULK_EDIT_ACTIONS.ADD_NOTE,
          BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
          BULK_EDIT_ACTIONS.FIND,
          BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
          BULK_EDIT_ACTIONS.REMOVE_ALL,
          BULK_EDIT_ACTIONS.REMOVE_MARK_AS_STAFF_ONLY,
        ],
      },
      // Loan and availability
      {
        option: 'Check in note',
        actions: [
          BULK_EDIT_ACTIONS.ADD_NOTE,
          BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
          BULK_EDIT_ACTIONS.DUPLICATE_TO,
          BULK_EDIT_ACTIONS.FIND,
          BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
          BULK_EDIT_ACTIONS.REMOVE_ALL,
          BULK_EDIT_ACTIONS.REMOVE_MARK_AS_STAFF_ONLY,
        ],
      },
      {
        option: 'Check out note',
        actions: [
          BULK_EDIT_ACTIONS.ADD_NOTE,
          BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE,
          BULK_EDIT_ACTIONS.DUPLICATE_TO,
          BULK_EDIT_ACTIONS.FIND,
          BULK_EDIT_ACTIONS.MARK_AS_STAFF_ONLY,
          BULK_EDIT_ACTIONS.REMOVE_ALL,
          BULK_EDIT_ACTIONS.REMOVE_MARK_AS_STAFF_ONLY,
        ],
      },
      {
        option: 'Item status',
        actions: [BULK_EDIT_ACTIONS.REPLACE_WITH],
      },
      {
        option: 'Permanent loan type',
        actions: [BULK_EDIT_ACTIONS.REPLACE_WITH],
      },
      {
        option: 'Temporary loan type',
        actions: [BULK_EDIT_ACTIONS.CLEAR_FIELD, BULK_EDIT_ACTIONS.REPLACE_WITH],
      },
      // Location
      {
        option: 'Permanent item location',
        actions: [BULK_EDIT_ACTIONS.CLEAR_FIELD, BULK_EDIT_ACTIONS.REPLACE_WITH],
      },
      {
        option: 'Temporary item location',
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

      if (optionAndActions.actions.includes(BULK_EDIT_ACTIONS.FIND)) {
        this.selectAction(BULK_EDIT_ACTIONS.FIND, rowIndex);
        cy.expect(
          this.getTargetRow(rowIndex)
            .find(this.secondActionsDropdown)
            .has({ optionsText: [BULK_EDIT_ACTIONS.REMOVE, BULK_EDIT_ACTIONS.REPLACE_WITH] }),
        );
      }
    });
  },

  expandSelectLoanTypeDropdown() {
    cy.do(Button({ id: 'loanType' }).click());
  },

  verifyLoanTypeExistsInSelectOptionDropdown(loanTypeName, isExists = true) {
    if (isExists) {
      cy.expect(
        SelectionList({ id: 'sl-container-loanType', optionList: some(loanTypeName) }).exists(),
      );
    } else {
      cy.expect(
        SelectionList({ id: 'sl-container-loanType', optionList: some(loanTypeName) }).absent(),
      );
    }
  },

  selectLoanTypeWhenChangingIt(loanTypeName) {
    cy.do(SelectionList({ id: 'sl-container-loanType' }).select(loanTypeName));
  },
};
