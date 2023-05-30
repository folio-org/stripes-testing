import DateTools from '../../utils/dateTools';
import { Button, Modal, TextField, Select, including } from '../../../../interactors';

const financialReport = Modal({ id: 'financial-transactions-report-modal' });
const startDateTextfield = TextField({ name: 'startDate' });
const firstDayOfMonth = DateTools.getFormattedDate({ date: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }, 'MM/DD/YYYY');
const feeFineOwnerSelect = Select({ content: including('Select fee/fine owner') });

export default {
  fillInRequiredFields({ startDate, ownerName }) {
    if (startDate) {
      cy.do(financialReport.find(startDateTextfield).fillIn(startDate));
    } else {
      cy.do(financialReport.find(startDateTextfield).fillIn(firstDayOfMonth));
      cy.expect(financialReport.find(feeFineOwnerSelect).exists());
      cy.do(financialReport.find(feeFineOwnerSelect).choose(ownerName));
    }
  },

  verifySaveButtonIsEnabled() {
    cy.do(financialReport.find(Button(including('Save'))).has({ disabled: false }));
  }
};
