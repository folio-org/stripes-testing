import {
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  including,
  KeyValue,
  PaneHeader,
  Pane,
  HTML,
  MultiColumnList,
  Link,
  Button,
} from '../../../../interactors';
import InvoiceEditForm from './invoiceEditForm';
import InvoiceLineEditForm from './invoiceLineEditForm';
import InvoiceLineDetails from './invoiceLineDetails';
import ApproveInvoiceModal from './modal/approveInvoiceModal';
import PayInvoiceModal from './modal/payInvoiceModal';
import CancelInvoiceModal from './modal/cancelInvoiceModal';
import SelectOrderLinesModal from './modal/selectOrderLinesModal';
import InvoiceStates from './invoiceStates';

const invoiceDetailsPane = Pane({ id: 'pane-invoiceDetails' });

// header section
const invoiceDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-invoiceDetails' });
const actionsButton = Button('Actions');
const newBlankLineButton = Button('New blank line');

// information section
const informationSection = invoiceDetailsPane.find(Section({ id: 'information' }));

// invoice lines section
const invoiceLinesSection = Section({ id: 'invoiceLines' });

export default {
  expandActionsDropdown() {
    cy.do(invoiceDetailsPaneHeader.find(actionsButton).click());
  },
  selectFirstInvoice() {
    cy.do(
      MultiColumnList({ id: 'invoices-list' })
        .find(MultiColumnListCell({ row: 0, columnIndex: 0 }))
        .find(Link())
        .click(),
    );
  },
  selectInvoiceLine() {
    cy.do(
      invoiceLinesSection
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .click(),
    );

    return InvoiceLineDetails;
  },
  openInvoiceEditForm() {
    cy.do([invoiceDetailsPaneHeader.find(actionsButton).click(), Button('Edit').click()]);
    InvoiceEditForm.waitLoading();

    return InvoiceEditForm;
  },
  openInvoiceLineEditForm() {
    cy.do([invoiceLinesSection.find(actionsButton).click(), newBlankLineButton.click()]);
    InvoiceLineEditForm.waitLoading();

    return InvoiceLineEditForm;
  },
  checkTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.poNumber) {
        cy.expect(
          invoiceLinesSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 1 }))
            .has({ content: including(record.poNumber) }),
        );
      }

      if (record.description) {
        cy.expect(
          invoiceLinesSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 2 }))
            .has({ content: including(record.description) }),
        );
      }

      if (record.receiptStatus) {
        cy.expect(
          invoiceLinesSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 5 }))
            .has({ content: including(record.receiptStatus) }),
        );
      }

      if (record.paymentStatus) {
        cy.expect(
          invoiceLinesSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 6 }))
            .has({ content: including(record.paymentStatus) }),
        );
      }
    });
  },
  checkInvoiceDetails({ title, invoiceInformation = [], invoiceLines } = {}) {
    if (title) {
      cy.expect(invoiceDetailsPane.has({ title: `Vendor invoice number - ${title}` }));
    }

    if (invoiceInformation.length) {
      invoiceInformation.forEach(({ key, value }) => {
        cy.expect(informationSection.find(KeyValue(key)).has({ value: including(value) }));
      });
    }

    if (invoiceLines) {
      cy.expect(
        invoiceLinesSection.has({
          text: including(`Total number of invoice lines: ${invoiceLines.length}`),
        }),
      );
      this.checkTableContent(invoiceLines);
    }
  },
  approveInvoice({ isApprovePayEnabled = false } = {}) {
    cy.do([
      invoiceDetailsPaneHeader.find(actionsButton).click(),
      Button(isApprovePayEnabled ? 'Approve & pay' : 'Approve').click(),
    ]);

    ApproveInvoiceModal.verifyModalView({ isApprovePayEnabled });
    ApproveInvoiceModal.clickSubmitButton({ isApprovePayEnabled });
  },
  payInvoice() {
    cy.do([invoiceDetailsPaneHeader.find(actionsButton).click(), Button('Pay').click()]);

    PayInvoiceModal.verifyModalView();
    PayInvoiceModal.clickSubmitButton();
  },
  cancelInvoice() {
    cy.do([invoiceDetailsPaneHeader.find(actionsButton).click(), Button('Cancel').click()]);

    CancelInvoiceModal.verifyModalView();
    CancelInvoiceModal.clickSubmitButton();
  },
  openSelectOrderLineModal() {
    cy.do([invoiceLinesSection.find(actionsButton).click(), Button('Add line from POL').click()]);
    SelectOrderLinesModal.verifyModalView();

    return SelectOrderLinesModal;
  },
  checkActionButtonsConditions(buttons = []) {
    buttons.forEach(({ label, conditions }) => {
      cy.expect(Button(label).has(conditions));
    });
  },
  checkInvoiceCanNotBeApprovedWarning() {
    cy.expect(invoiceDetailsPane.has({ text: including(InvoiceStates.invoiceCanNotBeApproved) }));
  },
  checkQuantityInvoiceLinesInRecord(quantity) {
    cy.expect(
      Pane({ id: 'pane-results' })
        .find(HTML(including(`${quantity} records found`)))
        .exists(),
    );
  },

  verifyTagsIsAbsent: () => {
    cy.expect(
      Pane({ id: 'pane-invoiceDetails' })
        .find(Button({ icon: 'tag' }))
        .absent(),
    );
  },

  verifyInvoiceNote: (note) => {
    cy.expect(Pane({ id: 'pane-invoiceDetails' }).find(KeyValue('Note')).has({ value: note }));
  },

  verifyInvoiceLineSubscription: (subscription) => {
    cy.expect(
      Pane({ id: 'pane-invoiceLineDetails' })
        .find(KeyValue('Subscription info'))
        .has({ value: subscription }),
    );
  },

  verifyInvoiceLineComment: (comment) => {
    cy.expect(
      Pane({ id: 'pane-invoiceLineDetails' }).find(KeyValue('Comment')).has({ value: comment }),
    );
  },

  verifyAcquisitionUnits: (acquisitionUnitName) => {
    cy.expect(
      Pane({ id: 'pane-invoiceDetails' })
        .find(KeyValue('Acquisition units'))
        .has({ value: acquisitionUnitName }),
    );
  },
};
