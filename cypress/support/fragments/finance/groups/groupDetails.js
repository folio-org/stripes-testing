import FinanceDetails from '../financeDetails';
import { PaneHeader, Section, including } from '../../../../../interactors';

const groupDetailsPane = Section({ id: 'pane-group-details' });
const groupDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-group-details' });

export default {
  ...FinanceDetails,
  waitLoading() {
    cy.expect(groupDetailsPane.exists());
  },
  verifyGroupName: (title) => {
    cy.expect(groupDetailsPane.find(groupDetailsPaneHeader).has({ text: including(title) }));
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
