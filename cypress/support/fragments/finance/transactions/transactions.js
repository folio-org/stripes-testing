import {
  Link,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  including,
} from '../../../../../interactors';
import TransactionDetails from './transactionDetails';

const transactionResultsPane = Section({ id: 'transaction-results-pane' });
const transactionResultsList = MultiColumnList({ id: 'transactions-list' });

export default {
  waitLoading() {
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
    cy.get('#finance-module-display button[icon=times]').first().click();
  },
};
