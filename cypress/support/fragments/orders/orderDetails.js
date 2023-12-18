import {
  Button,
  Pane,
  PaneHeader,
  Section,
  KeyValue,
  MultiColumnListCell,
  MultiColumnListRow,
  including,
  Link,
  Checkbox,
  Accordion,
  MultiColumnList,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import OrderLines from './orderLines';
import OrderLineDetails from './orderLineDetails';
import OrderLineEditForm from './orderLineEditForm';
import InventoryInstance from '../inventory/inventoryInstance';
import CreateInvoiceModal from './modals/createInvoiceModal';
import OpenConfirmationModal from './modals/openConfirmationModal';
import UnopenConfirmationModal from './modals/unopenConfirmationModal';
import ExportDetails from '../exportManager/exportDetails';
import Receivings from '../receiving/receiving';

const orderDetailsPane = Pane({ id: 'order-details' });
const actionsButton = Button('Actions');

const orderInfoSection = orderDetailsPane.find(Section({ id: 'purchaseOrder' }));
const poSummarySection = orderDetailsPane.find(Section({ id: 'POSummary' }));
const polListingAccordion = Section({ id: 'POListing' });

const exportDetailsSection = orderDetailsPane.find(Section({ id: 'exportDetails' }));

const headerDetail = orderDetailsPane.find(PaneHeader({ id: 'paneHeaderorder-details' }));

const invoicesList = MultiColumnList({ id: 'orderInvoices' });

const openPolDetails = (title) => {
  cy.do(polListingAccordion.find(MultiColumnListCell({ content: title })).click());

  OrderLineDetails.waitLoading();

  return OrderLineDetails;
};

export default {
  openPolDetails,
  checkOrderStatus(orderStatus) {
    cy.expect(poSummarySection.find(KeyValue('Workflow status')).has({ value: orderStatus }));
  },
  checkFieldsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(orderDetailsPane.find(KeyValue(label)).has(conditions));
    });
  },
  checkFieldsHasCopyIcon(fields = []) {
    fields.forEach(({ label }) => {
      cy.expect(
        orderDetailsPane
          .find(KeyValue(label))
          .find(Button({ icon: 'clipboard' }))
          .exists(),
      );
    });
  },
  checkOrderDetails({ summary = [] } = {}) {
    summary.forEach(({ key, value, checkbox }) => {
      if (checkbox) {
        cy.expect(poSummarySection.find(Checkbox(key)).has(value));
      } else {
        cy.expect(poSummarySection.find(KeyValue(key)).has({ value: including(value) }));
      }
    });
  },
  expandActionsDropdown() {
    cy.do(
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' }).find(actionsButton))
        .click(),
    );
  },
  copyOrderNumber(poNumber) {
    cy.do(
      orderInfoSection
        .find(KeyValue('PO number'))
        .find(Button({ icon: 'clipboard' }))
        .click(),
    );

    InteractorsTools.checkCalloutMessage(`Successfully copied "${poNumber}" to clipboard.`);
  },
  openOrder({ orderNumber, confirm = true } = {}) {
    this.expandActionsDropdown();
    cy.do(Button('Open').click());

    if (orderNumber) {
      OpenConfirmationModal.verifyModalView({ orderNumber });
    }

    if (confirm) {
      OpenConfirmationModal.confirm();
    }
  },
  unOpenOrder({ orderNumber, checkinItems = false, confirm = true, submit = false } = {}) {
    this.expandActionsDropdown();
    cy.do(Button('Unopen').click());

    if (orderNumber) {
      UnopenConfirmationModal.verifyModalView({ orderNumber, checkinItems });
    }

    if (confirm) {
      UnopenConfirmationModal.confirm({ submit });
    }

    // The Purchase order - <order number> has been successfully unopened
  },
  reOpenOrder({ orderNumber, checkMessage = true } = {}) {
    this.expandActionsDropdown();
    cy.do(Button('Reopen').click());

    if (checkMessage) {
      InteractorsTools.checkCalloutMessage(
        `The Purchase order - ${orderNumber} has been successfully reopened`,
      );
    }
  },
  openReceivingsPage() {
    this.expandActionsDropdown();
    cy.do(Button('Receive').click());
    Receivings.waitLoading();

    return Receivings;
  },
  createNewInvoice({ confirm = true } = {}) {
    this.expandActionsDropdown();
    cy.do(Button('New invoice').click());

    CreateInvoiceModal.verifyModalView();

    if (confirm) {
      CreateInvoiceModal.confirm();
    }
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
  checkOrderLinesTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.poLineNumber) {
        cy.expect(
          polListingAccordion
            .find(MultiColumnListCell({ row: index, column: 'POL number' }))
            .has({ content: including(record.poLineNumber) }),
        );
      }
      if (record.poLineTitle) {
        cy.expect(
          polListingAccordion
            .find(MultiColumnListCell({ row: index, column: 'Title or package name' }))
            .has({ content: including(record.poLineTitle) }),
        );
      }
    });

    if (!records.length) {
      cy.expect(polListingAccordion.has({ text: including('The list contains no items') }));
    }
  },
  checkIsItemsInInventoryCreated(title, location) {
    openPolDetails(title);
    OrderLines.openInstance();
    InventoryInstance.checkIsInstancePresented(title, location);
  },
  selectAddPOLine() {
    cy.do([
      polListingAccordion.find(actionsButton).focus(),
      polListingAccordion.find(actionsButton).click(),
      Button('Add PO line').click(),
    ]);

    OrderLineEditForm.waitLoading();

    return OrderLineEditForm;
  },
  verifyPOLCount(ordersCount) {
    if (ordersCount === 0) {
      cy.expect(
        Accordion({ label: including('PO lines') })
          .find(MultiColumnList({ id: 'POListing' }))
          .absent(),
      );
    } else {
      cy.expect(
        Accordion({ label: including('PO lines') })
          .find(MultiColumnList({ id: 'POListing' }))
          .has({ rowCount: ordersCount }),
      );
    }
  },

  verifyOrderListIncludeLinkExists(linkName) {
    cy.expect(
      MultiColumnList({ id: 'invoices-list' })
        .find(MultiColumnListCell({ content: linkName }))
        .find(Link())
        .exists(),
    );
  },

  verifyOrderTitle(title) {
    cy.expect(headerDetail.has({ text: including(title) }));
  },

  verifyAccordionExists(name) {
    cy.expect(Accordion({ label: including(name) }).exists());
  },

  openInvoice(number) {
    cy.do(invoicesList.find(Link({ href: including(`${number}`) })).click());
  },
};
