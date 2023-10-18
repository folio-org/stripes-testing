import {
  Button,
  KeyValue,
  Link,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneHeader,
  Section,
  Warning,
  including,
} from '../../../../interactors';
import OrderLineEditForm from './orderLineEditForm';
import TransactionDetails from '../finance/transactions/transactionDetails';

const orderLineDetailsSection = Section({ id: 'order-lines-details' });
const paneHeaderOrderLinesDetailes = orderLineDetailsSection.find(
  PaneHeader({ id: 'paneHeaderorder-lines-details' }),
);
const actionsButton = Button('Actions');

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
  openOrderLineEditForm() {
    cy.do([paneHeaderOrderLinesDetailes.find(actionsButton).click(), Button('Edit').click()]);

    OrderLineEditForm.waitLoading();

    return OrderLineEditForm;
  },
  openEncumbrancePane(rowIndex = 0) {
    this.clickTheLinkInFundDetailsSection({ rowIndex, columnIndex: 5 });

    TransactionDetails.waitLoading();

    return TransactionDetails;
  },
  checkWarningMessage(message) {
    cy.expect(orderLineDetailsSection.find(Warning()).has({ message }));
  },
  checkFundDistibutionTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.name) {
        cy.expect(
          fundDistributionsSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: including(record.name) }),
        );
      }
      if (record.encumbrance) {
        cy.expect(
          fundDistributionsSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 5 }))
            .has({ content: including(record.encumbrance) }),
        );
      }
    });
  },
  clickTheLinkInFundDetailsSection({ rowIndex = 0, columnIndex = 0 } = {}) {
    const link = fundDistributionsSection
      .find(MultiColumnListRow({ rowIndexInParent: `row-${rowIndex}` }))
      .find(MultiColumnListCell({ columnIndex }))
      .find(Link());

    cy.do([link.perform((el) => el.removeAttribute('target')), link.click()]);
  },
};
