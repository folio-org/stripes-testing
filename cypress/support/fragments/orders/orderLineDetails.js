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
import CancelConfirmationModal from './modals/cancelConfirmationModal';
import OrderLineEditForm from './orderLineEditForm';
import InventoryInstance from '../inventory/inventoryInstance';
import TransactionDetails from '../finance/transactions/transactionDetails';
import ExportDetails from '../exportManager/exportDetails';
import InteractorsTools from '../../utils/interactorsTools';
import VersionHistory from './orderVersionHistory';

const orderLineDetailsSection = Section({ id: 'order-lines-details' });
const paneHeaderOrderLinesDetailes = orderLineDetailsSection.find(
  PaneHeader({ id: 'paneHeaderorder-lines-details' }),
);
const backToOrderButton = Button({ id: 'clickable-backToPO' });
const actionsButton = Button('Actions');

const itemDetailsSection = orderLineDetailsSection.find(Section({ id: 'ItemDetails' }));
const purchaseOrderLineSection = orderLineDetailsSection.find(Section({ id: 'poLine' }));
const ongoingOrderSection = orderLineDetailsSection.find(Section({ id: 'ongoingOrder' }));
const fundDistributionsSection = orderLineDetailsSection.find(Section({ id: 'FundDistribution' }));
const vendorDetailsSection = orderLineDetailsSection.find(Section({ id: 'Vendor' }));
const costDetailsSection = orderLineDetailsSection.find(Section({ id: 'CostDetails' }));
const locationDetailsSection = orderLineDetailsSection.find(Section({ id: 'location' }));
const exportDetailsSection = orderLineDetailsSection.find(Section({ id: 'exportDetails' }));
const headerLinesDetail = PaneHeader({ id: 'paneHeaderorder-lines-details' });
const versionHistoryButton = Button({ id: 'version-history-btn' });

export default {
  waitLoading() {
    cy.expect(orderLineDetailsSection.exists());
  },
  backToOrderDetails() {
    cy.do(backToOrderButton.click());
  },
  checkFieldsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(orderLineDetailsSection.find(KeyValue(label)).has(conditions));
    });
  },
  checkFieldsHasCopyIcon(fields = []) {
    fields.forEach(({ label }) => {
      cy.expect(
        orderLineDetailsSection
          .find(KeyValue(label))
          .find(Button({ icon: 'clipboard' }))
          .exists(),
      );
    });
  },
  checkOrderLineDetails({
    purchaseOrderLineInformation = [],
    vendorDetails,
    costDetails,
    locationDetails,
  } = {}) {
    purchaseOrderLineInformation.forEach(({ key, value }) => {
      cy.expect(purchaseOrderLineSection.find(KeyValue(key)).has({ value: including(value) }));
    });

    if (vendorDetails) {
      this.checkVendorDetailsSection(vendorDetails);
    }

    if (costDetails) {
      this.checkCostDetailsSection(costDetails);
    }

    if (locationDetails) {
      this.checkLocationsSection(locationDetails);
    }
  },
  copyOrderNumber(poNumber) {
    cy.do(
      purchaseOrderLineSection
        .find(KeyValue('POL number'))
        .find(Button({ icon: 'clipboard' }))
        .click(),
    );

    InteractorsTools.checkCalloutMessage(`Successfully copied "${poNumber}" to clipboard.`);
  },
  expandActionsDropdown() {
    cy.do(paneHeaderOrderLinesDetailes.find(actionsButton).click());
  },
  cancelOrderLine({ orderLineNumber, confirm = true } = {}) {
    this.expandActionsDropdown();
    cy.do(Button('Cancel').click());

    if (orderLineNumber) {
      CancelConfirmationModal.verifyModalView({ orderLineNumber });
    }

    if (confirm) {
      CancelConfirmationModal.clickCancelOrderLineButton();
    }
  },
  openInventoryItem() {
    cy.do(itemDetailsSection.find(KeyValue('Title')).find(Link()).click());

    InventoryInstance.waitInventoryLoading();

    return InventoryInstance;
  },
  openOrderLineEditForm() {
    this.expandActionsDropdown();
    cy.do(Button('Edit').click());

    OrderLineEditForm.waitLoading();

    return OrderLineEditForm;
  },
  openEncumbrancePane(fundName) {
    this.clickTheLinkInFundDetailsSection({ fundName, columnIndex: 5 });

    TransactionDetails.waitLoading();

    return TransactionDetails;
  },
  clickTheLinkInFundDetailsSection({ fundName, columnIndex = 0 } = {}) {
    const tableRow = fundName
      ? fundDistributionsSection.find(
        MultiColumnListRow({ content: including(fundName), isContainer: true }),
      )
      : fundDistributionsSection.find(MultiColumnListRow({ rowIndexInParent: 'row-0' }));
    const link = tableRow.find(MultiColumnListCell({ columnIndex })).find(Link());

    cy.do([link.perform((el) => el.removeAttribute('target')), link.click()]);
  },
  checkExportJobDetailsPresent(present = true) {
    if (present) {
      cy.expect(exportDetailsSection.exists());
    } else {
      cy.expect(exportDetailsSection.absent());
    }
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
            .find(MultiColumnListCell({ row: index, column: 'Fund' }))
            .has({ content: including(record.name) }),
        );
      }
      if (record.expenseClass) {
        cy.expect(
          fundDistributionsSection
            .find(MultiColumnListCell({ row: index, column: 'Expense class' }))
            .has({ content: including(record.expenseClass) }),
        );
      }
      if (record.value) {
        cy.expect(
          fundDistributionsSection
            .find(MultiColumnListCell({ row: index, column: 'Value' }))
            .has({ content: including(record.value) }),
        );
      }
      if (record.amount) {
        cy.expect(
          fundDistributionsSection
            .find(MultiColumnListCell({ row: index, column: 'Amount' }))
            .has({ content: including(record.amount) }),
        );
      }
      if (record.initialEncumbrance) {
        cy.expect(
          fundDistributionsSection
            .find(MultiColumnListCell({ row: index, column: 'Initial encumbrance' }))
            .has({ content: including(record.initialEncumbrance) }),
        );
      }
      if (record.currentEncumbrance) {
        cy.expect(
          fundDistributionsSection
            .find(MultiColumnListCell({ row: index, column: 'Current encumbrance' }))
            .has({ content: including(record.currentEncumbrance) }),
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
            .find(MultiColumnListCell({ row: index, columnIndex: 1 }))
            .has({ content: including(record.date) }),
        );
      }
      if (record.fileName) {
        cy.expect(
          exportDetailsSection
            .find(MultiColumnListCell({ row: index, columnIndex: 2 }))
            .has({ content: including(record.fileName) }),
        );
      }
      if (record.configName) {
        cy.expect(
          exportDetailsSection
            .find(MultiColumnListCell({ row: index, columnIndex: 3 }))
            .has({ content: including(record.configName) }),
        );
      }
    });
  },
  checkOngoingOrderInformationSection({ ongoingOrderInformation = [] } = {}) {
    this.checkSectionData({ details: ongoingOrderInformation, section: ongoingOrderSection });
  },
  checkVendorDetailsSection({ vendorDetails = [] } = {}) {
    this.checkSectionData({ details: vendorDetails, section: vendorDetailsSection });
  },
  checkCostDetailsSection({ costDetails = [] } = {}) {
    this.checkSectionData({ details: costDetails, section: costDetailsSection });
  },
  checkSectionData({ details, section }) {
    details.forEach(({ key, value }) => {
      cy.expect(section.find(KeyValue(key)).has({ value: including(value) }));
    });
  },
  checkLocationsSection({ locations = [] } = {}) {
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
  verifyLinesDetailTitle(title) {
    cy.expect(orderLineDetailsSection.find(headerLinesDetail).has({ text: including(title) }));
  },
  openVersionHistory() {
    cy.do(versionHistoryButton.click());
    VersionHistory.waitLoading();

    return VersionHistory;
  },
};
