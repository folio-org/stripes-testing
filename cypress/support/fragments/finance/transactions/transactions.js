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
  selectFirstTransaction(type) {
    cy.get('[class^=mclRowFormatterContainer-]').contains(type).parent().find('a')
      .click();
  },
  checkTableContent({ records = [], skipRow }) {
    let startIndex = 0;

    records.forEach((record, index) => {
      cy.get(`#transactions-list [role="row"][data-row-index=row-${index}]`)
        .invoke('text')
        .then((text) => {
          if (!!skipRow && text.includes(skipRow)) {
            startIndex++;
          }

          if (record.type) {
            cy.expect(
              transactionResultsList
                .find(MultiColumnListRow({ rowIndexInParent: `row-${index + startIndex}` }))
                .find(MultiColumnListCell({ columnIndex: 1 }))
                .has({ content: including(record.type) }),
            );
          }

          if (record.amount) {
            cy.expect(
              transactionResultsList
                .find(MultiColumnListRow({ rowIndexInParent: `row-${index + startIndex}` }))
                .find(MultiColumnListCell({ columnIndex: 2 }))
                .has({ content: including(record.amount) }),
            );
          }
        });
    });
  },
  closeTransactionsPage() {
    cy.get('#finance-module-display button[icon=times]').first().click();
  },
};
