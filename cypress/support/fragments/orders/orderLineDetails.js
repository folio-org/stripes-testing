import {
  Button,
  InfoRow,
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
import InventoryInstance from '../inventory/inventoryInstance';
import TransactionDetails from '../finance/transactions/transactionDetails';
import ExportDetails from '../exportManager/exportDetails';

const orderLineDetailsSection = Section({ id: 'order-lines-details' });
const paneHeaderOrderLinesDetailes = orderLineDetailsSection.find(
  PaneHeader({ id: 'paneHeaderorder-lines-details' }),
);
const backToOrderButton = Button({ id: 'clickable-backToPO' });
const actionsButton = Button('Actions');

const itemDetailsSection = orderLineDetailsSection.find(Section({ id: 'ItemDetails' }));
const purchaseOrderLineSection = orderLineDetailsSection.find(Section({ id: 'poLine' }));
const fundDistributionsSection = orderLineDetailsSection.find(Section({ id: 'FundDistribution' }));
const locationDetailsSection = orderLineDetailsSection.find(Section({ id: 'location' }));
const exportDetailsSection = orderLineDetailsSection.find(Section({ id: 'exportDetails' }));

export default {
  waitLoading() {
    cy.expect(orderLineDetailsSection.exists());
  },
  backToOrderDetails() {
    cy.do(backToOrderButton.click());
  },
  checkOrderLineDetails({ purchaseOrderLineInformation = [] } = {}) {
    purchaseOrderLineInformation.forEach(({ key, value }) => {
      cy.expect(purchaseOrderLineSection.find(KeyValue(key)).has({ value: including(value) }));
    });
  },
  openInventoryItem() {
    cy.do(itemDetailsSection.find(KeyValue('Title')).find(Link()).click());

    InventoryInstance.waitInventoryLoading();

    return InventoryInstance;
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
  clickTheLinkInFundDetailsSection({ rowIndex = 0, columnIndex = 0 } = {}) {
    const link = fundDistributionsSection
      .find(MultiColumnListRow({ rowIndexInParent: `row-${rowIndex}` }))
      .find(MultiColumnListCell({ columnIndex }))
      .find(Link());

    cy.do([link.perform((el) => el.removeAttribute('target')), link.click()]);
  },
  expandExportJobDetails() {
    cy.do(exportDetailsSection.find(Button('Export details')).click());
  },
  openExportJobDetails({ rowIndex = 0, columnIndex = 0 } = {}) {
    cy.do(
      exportDetailsSection
        .find(MultiColumnListRow({ rowIndexInParent: `row-${rowIndex}` }))
        .find(MultiColumnListCell({ columnIndex }))
        .find(Link())
        .click(),
    );
    ExportDetails.waitLoading();

    return ExportDetails;
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

    if (!records.length) {
      cy.expect(fundDistributionsSection.has({ text: including('The list contains no items') }));
    }
  },
  checkExportDetailsTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.date) {
        cy.expect(
          exportDetailsSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 1 }))
            .has({ content: including(record.date) }),
        );
      }
      if (record.fileName) {
        cy.expect(
          exportDetailsSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 2 }))
            .has({ content: including(record.fileName) }),
        );
      }
      if (record.configName) {
        cy.expect(
          exportDetailsSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 3 }))
            .has({ content: including(record.configName) }),
        );
      }
    });
  },
  checkLocationsSection({ locations = [] }) {
    locations.forEach((locationInformation, index) => {
      locationInformation.forEach(({ key, value }) => {
        cy.expect(
          locationDetailsSection
            .find(InfoRow({ index }))
            .find(KeyValue(key))
            .has({ value: including(value) }),
        );
      });
    });
  },
};
