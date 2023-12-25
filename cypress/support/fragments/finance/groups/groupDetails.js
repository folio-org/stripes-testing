import { Section } from '../../../../../interactors';
import FinanceDetails from '../financeDetails';

const groupDetailsPane = Section({ id: 'pane-group-details' });

export default {
  ...FinanceDetails,
  waitLoading() {
    cy.expect(groupDetailsPane.exists());
  },
  checkGroupDetails({ information, financialSummary, funds } = {}) {
    if (information) {
      FinanceDetails.checkInformation(information);
    }
    if (financialSummary) {
      FinanceDetails.checkFinancialSummary(financialSummary);
    }
    if (funds) {
      FinanceDetails.checkFundsDetails(funds);
    }
  },
};
