import {
  KeyValue,
  Link,
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  including,
} from '../../../../interactors';
import TransactionDetails from '../finance/transactions/transactionDetails';

const orderLineDetailsSection = Section({ id: 'order-lines-details' });
const purchaseOrderLineSection = orderLineDetailsSection.find(Section({ id: 'poLine' }));
const fundDistributionsSection = orderLineDetailsSection.find(Section({ id: 'FundDistribution' }));

export default {
  waitLoading() {
    cy.expect(orderLineDetailsSection.exists());
  },
  checkOrderLineDetails({ purchaseOrderLineInformation = [] } = {}) {
    purchaseOrderLineInformation.forEach(({ key, value }) => {
      cy.expect(purchaseOrderLineSection.find(KeyValue(key)).has({ value: including(value) }));
    });
  },
  openEncumbrancePane(rowIndex = 0) {
    this.clickTheLinkInFundDetailsSection({ rowIndex, columnIndex: 5 });

    TransactionDetails.waitLoading();

    return TransactionDetails;
  },
  clickTheLinkInFundDetailsSection({ rowIndex = 0, columnIndex = 0 } = {}) {
    const link = fundDistributionsSection
      .find(MultiColumnListRow({ rowIndexInParent: `row-${rowIndex}` }))
      .find(MultiColumnListCell({ columnIndex }))
      .find(Link());

    cy.do([link.perform((el) => el.removeAttribute('target')), link.click()]);
  },
};
