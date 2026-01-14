import {
  Button,
  KeyValue,
  Section,
  PaneHeader,
  Popover,
  including,
  Link,
} from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';

const transactionDetailSection = Section({ id: 'pane-transaction-details' });
const transactionDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-transaction-details' });

const informationSection = Section({ id: 'information' });

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
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

  checkEncumbranceApiResponse(
    interception,
    { expectedStatus, expectedEncumbranceStatus, expectedOrderStatus } = {},
  ) {
    expect(interception.response.statusCode).to.equal(expectedStatus);

    if (expectedEncumbranceStatus) {
      expect(interception.response.body.encumbrance.status).to.equal(expectedEncumbranceStatus);
    }
    if (expectedOrderStatus) {
      expect(interception.response.body.encumbrance.orderStatus).to.equal(expectedOrderStatus);
    }
  },
};
