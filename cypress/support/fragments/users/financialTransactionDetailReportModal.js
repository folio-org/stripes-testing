import DateTools from '../../utils/dateTools';
import { Button, Modal, TextField, Select, including, MultiSelect } from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const financialReport = Modal({ id: 'financial-transactions-report-modal' });
const startDateTextfield = TextField({ name: 'startDate' });
const endDateTextfield = TextField({ name: 'endDate' });
const firstDayOfMonth = DateTools.getFormattedDate({ date: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }, 'MM/DD/YYYY');
const currentDayOfMonth = DateTools.getFormattedDate({ date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) }, 'MM/DD/YYYY');
const feeFineOwnerSelect = Select({ content: including('Select fee/fine owner') });
const calloutMessage = 'Export in progress';

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

  fillInEndDate(endDate) {
    if (endDate) cy.do(financialReport.find(endDateTextfield).fillIn(endDate));
    else cy.do(financialReport.find(endDateTextfield).fillIn(currentDayOfMonth));
  },

  verifySaveButtonIsEnabled() {
    cy.do(financialReport.find(Button(including('Save'))).has({ disabled: false }));
  },

  save() {
    cy.do(financialReport.find(Button(including('Save'))).click());
  },

  verifyCalloutMessage() {
    InteractorsTools.checkCalloutMessage(calloutMessage);
  },

  fillInServicePoints(servicePoints) {
    cy.do([financialReport.find(MultiSelect({ label: 'Associated service points' })).choose(servicePoints)]);
  },
};
