import { Button, PaneHeader, Pane } from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';

const financialTransactionsReportButton = Button({ id: 'financial-transaction-report' });
const actionsButtonInSearchResultsPane = Pane({ id: 'users-search-results-pane' }).find(
  Button('Actions'),
);

const actionsButtons = {
  financialTransactionsReport: financialTransactionsReportButton,
};

export default {
  waitLoading: () => {
    cy.intercept('/owners*').as('getOwners');
    // this waiter is needed at least for the reports creation
    cy.wait('@getOwners', getLongDelay());
    cy.expect(PaneHeader('User search results').exists());
  },
  verifyOptionsInActionsMenu: (options = ['financialTransactionsReport']) => {
    cy.expect(actionsButtonInSearchResultsPane.exists());
    cy.do(actionsButtonInSearchResultsPane.click());
    options.forEach((option) => {
      cy.expect(actionsButtons[option].exists());
    });
  },
  openFinancialTransactionDetailReportModal: () => {
    cy.do([
      actionsButtonInSearchResultsPane.click(),
      actionsButtons.financialTransactionsReport.click(),
    ]);
  },

  clickActionsButton: () => {
    cy.do([actionsButtonInSearchResultsPane.click()]);
  },
};
