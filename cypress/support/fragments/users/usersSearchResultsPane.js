import {
  Button,
  PaneHeader,
  Pane,
} from '../../../../interactors';

const financialTransactionsReportButton = Button({ id: 'financial-transaction-report' });
const actionsButtonInSearchResultsPane = Pane({ id: 'users-search-results-pane' }).find(Button('Actions'));

const actionsButtons = {
  financialTransactionsReport: financialTransactionsReportButton,
};

export default {
  waitLoading:() => cy.expect(PaneHeader('User search results').exists()),
  verifyOptionsInActionsMenu: (options = ['financialTransactionsReport']) => {
    cy.expect(actionsButtonInSearchResultsPane.exists());
    cy.do(actionsButtonInSearchResultsPane.click());
    options.forEach((option) => {
      cy.expect(actionsButtons[option].exists());
    });
  },
};
