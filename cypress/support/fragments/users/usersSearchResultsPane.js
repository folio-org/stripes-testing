import {
  Button,
  PaneHeader,
  Pane,
  PaneContent,
  MultiColumnListCell,
  including,
  MultiColumnList,
  MultiColumnListRow,
} from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';

const searchResultsPaneContent = PaneContent({ id: 'users-search-results-pane-content' });
const financialTransactionsReportButton = Button({ id: 'financial-transaction-report' });
const overdueLoansExportButton = Button('Overdue loans report (CSV)');
const actionsButtonInSearchResultsPane = Pane({ id: 'users-search-results-pane' }).find(
  Button('Actions'),
);
const newButton = Button({ id: 'clickable-newuser' });

const actionsButtons = {
  financialTransactionsReport: financialTransactionsReportButton,
  overdueLoansExport: overdueLoansExportButton,
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

  exportOverdueLoans: () => {
    cy.do([actionsButtonInSearchResultsPane.click(), actionsButtons.overdueLoansExport.click()]);
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

  checkSearchResultsCount(rowCount) {
    cy.expect(searchResultsPaneContent.find(MultiColumnList({ rowCount })).exists());
  },

  verifyUserIsNotPresentInTheList(...userFields) {
    userFields.forEach((field) => {
      cy.expect(
        searchResultsPaneContent
          .find(MultiColumnListRow({ content: including(field), isContainer: true }))
          .absent(),
      );
    });
  },

  verifyUserIsPresentInTheList(...userFields) {
    userFields.forEach((field) => {
      cy.expect(
        searchResultsPaneContent
          .find(MultiColumnListRow({ content: including(field), isContainer: true }))
          .exists(),
      );
    });
  },

  verifySearchResultsForPreferredName(expectedPreferredName, unexpectedPreferredName) {
    cy.wait(2000);
    this.checkSearchResultsCount(1);
    this.verifyUserIsPresentInTheList(expectedPreferredName);
    this.verifyUserIsNotPresentInTheList(unexpectedPreferredName);
    cy.wait(2000);
  },
};
