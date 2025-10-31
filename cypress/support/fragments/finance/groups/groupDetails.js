import { PaneHeader, Section, including } from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';
import FinanceDetails from '../financeDetails';

const groupDetailsPane = Section({ id: 'pane-group-details' });
const expenseClassSection = groupDetailsPane.find(Section({ id: 'expenseClasses' }));
const groupDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-group-details' });

export default {
  ...FinanceDetails,
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(groupDetailsPane.exists());
  },
  verifyGroupName: (title) => {
    cy.expect(groupDetailsPane.find(groupDetailsPaneHeader).has({ text: including(title) }));
  },
  checkGroupDetails({ information, financialSummary, funds, expenseClass } = {}) {
    if (information) {
      FinanceDetails.checkInformation(information);
    }
    if (financialSummary) {
      FinanceDetails.checkFinancialSummary(financialSummary);
    }
    if (funds) {
      FinanceDetails.checkFundsDetails(funds);
    }
    if (expenseClass) {
      FinanceDetails.checkExpenseClassesTableContent({
        section: expenseClassSection,
        items: [expenseClass],
      });
    }
  },
};
