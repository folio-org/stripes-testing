import {
  Button,
  PaneHeader,
  Pane,
  PaneContent,
  MultiColumnListCell,
  including,
} from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';

const searchResultsPaneContent = PaneContent({ id: 'users-search-results-pane-content' });
const financialTransactionsReportButton = Button({ id: 'financial-transaction-report' });
const actionsButtonInSearchResultsPane = Pane({ id: 'users-search-results-pane' }).find(
  Button('Actions'),
);
const newButton = Button({ id: 'clickable-newuser' });

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

  verifyActionsButtonEnabled: () => cy.do(actionsButtonInSearchResultsPane.has({ disabled: false })),

  openFinancialTransactionDetailReportModal: () => {
    cy.do([
      actionsButtonInSearchResultsPane.click(),
      actionsButtons.financialTransactionsReport.click(),
    ]);
  },

  openNewUser: () => {
    cy.do([actionsButtonInSearchResultsPane.click(), newButton.click()]);
  },

  clickActionsButton: () => {
    cy.do([actionsButtonInSearchResultsPane.click()]);
  },

  verifySearchPaneIsEmpty(isResultsEmpty = true) {
    if (isResultsEmpty) {
      cy.expect([searchResultsPaneContent.has({ empty: true })]);
    } else {
      cy.expect([searchResultsPaneContent.has({ empty: false })]);
    }
  },

  verifyResultsListHasUserWithName(userName) {
    cy.expect([
      searchResultsPaneContent
        .find(MultiColumnListCell({ column: 'Name' }))
        .has({ content: including(userName) }),
    ]);
  },
};
