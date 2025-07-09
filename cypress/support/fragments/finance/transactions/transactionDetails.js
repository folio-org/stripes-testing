import {
  Button,
  KeyValue,
  Section,
  PaneHeader,
  Popover,
  including,
  Link,
} from '../../../../../interactors';

const transactionDetailSection = Section({ id: 'pane-transaction-details' });
const transactionDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-transaction-details' });

const informationSection = Section({ id: 'information' });

export default {
  waitLoading() {
    cy.wait(4000);
    cy.expect(transactionDetailSection.exists());
  },
  checkTransactionDetails({ information = [] } = {}) {
    information.forEach(({ key, value }) => {
      cy.expect(informationSection.find(KeyValue(key)).has({ value: including(value) }));
    });
  },
  checkTransactionAmountInfo(content) {
    cy.do(
      transactionDetailSection
        .find(KeyValue('Amount'))
        .find(Button({ icon: 'info' }))
        .click(),
    );
    cy.expect(Popover().has({ content }));
  },
  closeTransactionDetails() {
    cy.do(transactionDetailsPaneHeader.find(Button({ icon: 'times' })).click());
  },

  openSourceInTransactionDetails(source) {
    cy.do(transactionDetailSection.find(Link(source)).click());
  },
};
