import {
  Link,
  Button,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  including,
} from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';
import TransactionDetails from './transactionDetails';

const transactionResultsPane = Section({ id: 'transaction-results-pane' });
const transactionResultsList = MultiColumnList({ id: 'transactions-list' });
const nextButton = Button('Next');
const previousButton = Button('Previous');

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(transactionResultsPane.exists());
  },
  checkTransactionsList({ records = [], present = true } = {}) {
    records.forEach(({ type, amount }) => {
      const content = amount ? `${type}(${amount})` : type;

      if (present) {
        cy.expect(
          transactionResultsList
            .find(MultiColumnListRow({ content: including(content), isContainer: true }))
            .exists(),
        );
      } else {
        cy.expect(
          transactionResultsList
            .find(MultiColumnListRow({ content: including(content), isContainer: true }))
            .absent(),
        );
      }
    });
  },
  selectTransaction(type) {
    cy.do(
      transactionResultsList
        .find(MultiColumnListRow({ content: including(type), isContainer: true }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .find(Link())
        .click(),
    );

    TransactionDetails.waitLoading();

    return TransactionDetails;
  },
  closeTransactionsPage() {
    cy.wait(4000);

    cy.get('#finance-module-display button[icon=times]').first().click();
    cy.wait(4000);
  },

  clickNextPagination() {
    cy.do(nextButton.click());
  },

  clickPreviousPagination() {
    cy.do(previousButton.click());
  },
};
