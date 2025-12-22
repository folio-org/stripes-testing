import {
  Accordion,
  Button,
  Checkbox,
  including,
  KeyValue,
  Link,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  PaneHeader,
  Section,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';
import ExportDetails from '../exportManager/exportDetails';
import InventoryInstance from '../inventory/inventoryInstance';
import Receivings from '../receiving/receiving';
import CloseConfirmationModal from './modals/closeConfirmationModal';
import CreateInvoiceModal from './modals/createInvoiceModal';
import OpenConfirmationModal from './modals/openConfirmationModal';
import UnopenConfirmationModal from './modals/unopenConfirmationModal';
import OrderEditForm from './orderEditForm';
import OrderLineDetails from './orderLineDetails';
import OrderLineEditForm from './orderLineEditForm';
import OrderLines from './orderLines';

const orderDetailsPane = Pane({ id: 'order-details' });
const actionsButton = Button('Actions');

const orderInfoSection = orderDetailsPane.find(Section({ id: 'purchaseOrder' }));
const ongoingOrderInfoSection = orderDetailsPane.find(Section({ id: 'ongoing' }));
const poSummarySection = orderDetailsPane.find(Section({ id: 'POSummary' }));
const polListingAccordion = Section({ id: 'POListing' });

const exportDetailsSection = orderDetailsPane.find(Section({ id: 'exportDetails' }));
const relatedInvoicesSection = orderDetailsPane.find(Section({ id: 'relatedInvoices' }));
const headerDetail = orderDetailsPane.find(PaneHeader({ id: 'paneHeaderorder-details' }));

const iconTimes = Button({ icon: 'times' });

const invoicesList = MultiColumnList({ id: 'orderInvoices' });

const openPolDetails = (title) => {
  cy.do(polListingAccordion.find(MultiColumnListCell({ content: title })).click());

  OrderLineDetails.waitLoading();

  return OrderLineDetails;
};

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(orderDetailsPane.exists());
  },
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
  checkOrderDetails({ orderInformation = [], ongoingInformation = [], summary = [] } = {}) {
    orderInformation.forEach(({ key, value, checkbox }) => {
      if (checkbox) {
        cy.expect(orderInfoSection.find(Checkbox(key)).has(value));
      } else {
        cy.expect(orderInfoSection.find(KeyValue(key)).has({ value: including(value) }));
      }
    });

    ongoingInformation.forEach(({ key, value, checkbox }) => {
      if (checkbox) {
        cy.expect(ongoingOrderInfoSection.find(Checkbox(key)).has(value));
      } else {
        cy.expect(ongoingOrderInfoSection.find(KeyValue(key)).has({ value: including(value) }));
      }
    });

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
  openOrderEditForm() {
    this.expandActionsDropdown();
    cy.do(Button('Edit').click());
    OrderEditForm.waitLoading();

    return OrderEditForm;
  },
  closeOrder({ orderNumber, confirm = true } = {}) {
    this.expandActionsDropdown();
    cy.do(Button('Cancel').click());

    if (orderNumber) {
      CloseConfirmationModal.verifyModalView({ orderNumber });
    }

    if (confirm) {
      CloseConfirmationModal.clickSubmitButton();
    }
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

  checkAccordionColumnItem(rowIndex, columnName, value) {
    cy.expect(
      relatedInvoicesSection
        .find(MultiColumnListCell({ row: rowIndex, column: columnName }))
        .has({ content: including(value) }),
    );
  },

  checkRelatedInvoicesTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.invoiceNumber) {
        this.checkAccordionColumnItem(index, 'Invoice #', record.invoiceNumber);
      }
      if (record.fiscalYear) {
        this.checkAccordionColumnItem(index, 'Fiscal year', record.fiscalYear);
      }
      if (record.invoiceDate) {
        this.checkAccordionColumnItem(index, 'Invoice date', record.invoiceDate);
      }
      if (record.vendorCode) {
        this.checkAccordionColumnItem(index, 'Vendor code', record.vendorCode);
      }
      if (record.vendorInvoiceNumber) {
        this.checkAccordionColumnItem(index, 'Vendor invoice #', record.vendorInvoiceNumber);
      }
      if (record.status) {
        this.checkAccordionColumnItem(index, 'Status', record.status);
      }
      if (record.invoiceAmount) {
        this.checkAccordionColumnItem(index, 'Expended amount', record.expendedAmount);
      }
    });
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

  verifyOrderTitle(title) {
    cy.expect(headerDetail.has({ text: including(title) }));
  },

  closeOrderDetails: () => {
    cy.do(orderDetailsPane.find(iconTimes).click());
  },

  verifyAccordionExists(name) {
    cy.expect(Accordion({ label: including(name) }).exists());
  },

  openInvoice(number) {
    cy.do(invoicesList.find(Link({ href: including(`${number}`) })).click());
  },

  updateEncumbrances() {
    this.expandActionsDropdown();
    cy.do(Button('Update encumbrances').click());
  },

  checkApiErrorResponse(
    interception,
    { expectedStatus, expectedErrorCode, expectedErrorMessage } = {},
  ) {
    expect(interception.response.statusCode).to.equal(expectedStatus);

    if (expectedErrorCode) {
      expect(interception.response.body.errors[0].code).to.equal(expectedErrorCode);
    }
    if (expectedErrorMessage) {
      expect(interception.response.body.errors[0].message).to.equal(expectedErrorMessage);
    }
  },
};
