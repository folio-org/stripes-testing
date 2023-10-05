import { KeyValue, Section, including } from '../../../../../interactors';

const transactionDetailSection = Section({ id: 'pane-transaction-details' });

export default {
  waitLoading() {
    cy.expect(transactionDetailSection.exists());
  },
  checkTransactionDetails(properties = []) {
    properties.forEach(({ key, value }) => {
      cy.expect(transactionDetailSection.find(KeyValue(key)).has({ value: including(value) }));
    });
  },
};
