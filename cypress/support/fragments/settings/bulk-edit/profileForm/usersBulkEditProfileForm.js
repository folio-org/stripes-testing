import { Button, Pane, Select, TextField, including } from '../../../../../../interactors';
import { BULK_EDIT_ACTIONS } from '../../../../constants';
import DateTools from '../../../../utils/dateTools';
import BulkEditProfileForm from './bulkEditProfileForm';

const newProfilePane = Pane('New users bulk edit profile');
const calendarButton = Button({ icon: 'calendar' });
const patronGroupSelect = Select('Patron group select');
const findEmailTextField = TextField({ testid: 'input-email-0' });
const replaceEmailTextField = TextField({ testid: 'input-email-1' });

export default {
  ...BulkEditProfileForm,

  waitLoading() {
    cy.expect(newProfilePane.exists());
  },

  verifyNewProfilePaneAbsent() {
    cy.expect(newProfilePane.absent());
  },

  selectPatronGroup(patronGroup, rowIndex = 0) {
    cy.do(this.getTargetRow(rowIndex).find(patronGroupSelect).choose(including(patronGroup)));
  },

  verifySelectedPatronGroup(patronGroup, rowIndex = 0) {
    cy.expect(
      this.getTargetRow(rowIndex)
        .find(patronGroupSelect)
        .has({ checkedOptionText: including(patronGroup) }),
    );
  },

  selectExpirationDate(date, rowIndex = 0) {
    const formattedDate = DateTools.getFormattedDate({ date }, 'MM/DD/YYYY');

    cy.do([
      this.getTargetRow(rowIndex).find(calendarButton).click(),
      this.getTargetRow(rowIndex)
        .find(TextField({ placeholder: 'MM/DD/YYYY' }))
        .fillIn(formattedDate),
    ]);
  },

  verifyExpirationDateValue(date, rowIndex = 0) {
    const formattedDate = DateTools.getFormattedDate({ date }, 'MM/DD/YYYY');

    cy.expect(
      this.getTargetRow(rowIndex)
        .find(TextField({ value: formattedDate }))
        .exists(),
    );
  },

  fillEmailFindText(text, rowIndex = 0) {
    cy.do(this.getTargetRow(rowIndex).find(findEmailTextField).fillIn(text));
  },

  verifyEmailFindText(text, rowIndex = 0) {
    cy.expect(this.getTargetRow(rowIndex).find(findEmailTextField).has({ value: text }));
  },

  fillEmailReplaceText(text, rowIndex = 0) {
    cy.do(this.getTargetRow(rowIndex).find(replaceEmailTextField).fillIn(text));
  },

  verifyEmailReplaceText(text, rowIndex = 0) {
    cy.expect(this.getTargetRow(rowIndex).find(replaceEmailTextField).has({ value: text }));
  },

  verifyAvailableOptionsAndActions(rowIndex = 0) {
    const availableOptionsAndActions = [
      {
        option: 'Expiration date',
        actions: [BULK_EDIT_ACTIONS.REPLACE_WITH],
      },
      {
        option: 'Email',
        actions: [BULK_EDIT_ACTIONS.FIND],
      },
      {
        option: 'Patron group',
        actions: [BULK_EDIT_ACTIONS.REPLACE_WITH],
      },
    ];

    availableOptionsAndActions.forEach((optionAndActions) => {
      this.selectOption(optionAndActions.option, rowIndex);

      cy.expect(
        this.getTargetRow(rowIndex)
          .find(this.actionsDropdown)
          .has({ optionsText: optionAndActions.actions }),
      );

      // Verify second actions dropdown for Email (Find/Replace pattern)
      if (optionAndActions.actions.includes(BULK_EDIT_ACTIONS.FIND)) {
        cy.expect(
          this.getTargetRow(rowIndex)
            .find(this.secondActionsDropdown)
            .has({ optionsText: [BULK_EDIT_ACTIONS.REPLACE_WITH] }),
        );
      }
    });
  },
};
