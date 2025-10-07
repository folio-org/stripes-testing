import BulkEditProfileView from './bulkEditProfileView';
import { RepeatableFieldItem, Select, TextField, including } from '../../../../../../interactors';
import DateTools from '../../../../utils/dateTools';

export default {
  ...BulkEditProfileView,

  verifySelectedPatronGroup(patronGroup, rowIndex = 0) {
    cy.expect(
      this.getTargetRow(rowIndex)
        .find(Select('Patron group select'))
        .has({ checkedOptionText: including(patronGroup), disabled: true }),
    );
  },

  verifySelectedExpirationDate(date, rowIndex = 0) {
    const formattedDate = DateTools.getFormattedDate({ date }, 'MM/DD/YYYY');

    cy.expect([
      RepeatableFieldItem({ index: rowIndex })
        .find(TextField({ value: formattedDate, disabled: true }))
        .exists(),
    ]);
  },

  verifyEmailFindText(text, rowIndex = 0) {
    cy.expect(
      this.getTargetRow(rowIndex)
        .find(TextField({ testid: 'input-email-0' }))
        .has({ value: text, disabled: true }),
    );
  },

  verifyEmailReplaceText(text, rowIndex = 0) {
    cy.expect(
      this.getTargetRow(rowIndex)
        .find(TextField({ testid: 'input-email-1' }))
        .has({ value: text, disabled: true }),
    );
  },
};
