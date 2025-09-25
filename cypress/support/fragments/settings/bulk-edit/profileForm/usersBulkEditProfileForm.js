import { Button, Pane, Select, TextField, including } from '../../../../../../interactors';
import DateTools from '../../../../utils/dateTools';
import BulkEditProfileForm from './bulkEditProfileForm';

const newProfilePane = Pane('New users bulk edit profile');
const calendarButton = Button({ icon: 'calendar' });
const patronGroupSelect = Select('Patron group select');

export default {
  ...BulkEditProfileForm,

  waitLoading() {
    cy.expect(newProfilePane.exists());
  },

  verifyNewProfilePaneAbsent() {
    cy.expect(newProfilePane.absent());
  },

  selectPatronGroup(patronGroup, rowIndex = 0) {
    cy.do(this.targetRow(rowIndex).find(patronGroupSelect).choose(including(patronGroup)));
  },

  verifyPatronGroupValue(patronGroup, rowIndex = 0) {
    cy.expect(
      this.targetRow(rowIndex)
        .find(patronGroupSelect)
        .has({ checkedOptionText: including(patronGroup) }),
    );
  },

  selectExpirationDate(date, rowIndex = 0) {
    const formattedDate = DateTools.getFormattedDate({ date }, 'MM/DD/YYYY');

    cy.do([
      this.targetRow(rowIndex).find(calendarButton).click(),
      this.targetRow(rowIndex)
        .find(TextField({ placeholder: 'MM/DD/YYYY' }))
        .fillIn(formattedDate),
    ]);
  },

  verifyExpirationDateValue(date, rowIndex = 0) {
    const formattedDate = DateTools.getFormattedDate({ date }, 'MM/DD/YYYY');

    cy.expect(
      this.targetRow(rowIndex)
        .find(TextField({ value: formattedDate }))
        .exists(),
    );
  },

  fillEmailFindText(text, rowIndex = 0) {
    cy.do(
      this.targetRow(rowIndex)
        .find(TextField({ testid: 'input-email-0' }))
        .fillIn(text),
    );
  },

  fillEmailReplaceText(text, rowIndex = 0) {
    cy.do(
      this.targetRow(rowIndex)
        .find(TextField({ testid: 'input-email-1' }))
        .fillIn(text),
    );
  },
};
