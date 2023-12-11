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

// Links & documents section
const linksAndDocumentsSection = Section({ id: 'documents' });

// voucher details
const voucherExportDetailsSection = invoiceDetailsPane.find(Section({ id: 'batchVoucherExport' }));
const voucherInformationSection = invoiceDetailsPane.find(Section({ id: 'voucher' }));

export default {
  expandActionsDropdown() {
    cy.do(invoiceDetailsPaneHeader.find(actionsButton).click());
  },
  verifyLinksDocumentsSection(linkName, externalUrl, documentName) {
    cy.do(Button('Links & documents').click());
    cy.expect([
      linksAndDocumentsSection.find(MultiColumnListCell({ column: 'Link name' })).has({
        content: linkName,
      }),
      linksAndDocumentsSection.find(MultiColumnListCell({ column: 'External URL' })).has({
        content: externalUrl,
      }),
      linksAndDocumentsSection.find(MultiColumnListCell({ column: 'Document name' })).has({
        content: documentName,
      }),
    ]);
  },
  selectFirstInvoice() {
    cy.do(
      MultiColumnList({ id: 'invoices-list' })
        .find(MultiColumnListCell({ row: 0, columnIndex: 0 }))
        .find(Link())
        .click(),
    );
  },
  selectInvoiceLine(index = 0) {
    cy.do(
      invoiceLinesSection
        .find(MultiColumnListRow({ index }))
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
  checkInvoiceLinesTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.poNumber) {
        cy.expect(
          invoiceLinesSection
            .find(MultiColumnListCell({ row: index, column: 'POL number' }))
            .has({ content: including(record.poNumber) }),
        );
      }

      if (record.description) {
        cy.expect(
          invoiceLinesSection
            .find(MultiColumnListCell({ row: index, column: 'Description' }))
            .has({ content: including(record.description) }),
        );
      }

      if (record.fundCode) {
        cy.expect(
          invoiceLinesSection
            .find(MultiColumnListCell({ row: index, column: 'Fund code' }))
            .has({ content: including(record.fundCode) }),
        );
      }

      if (record.receiptStatus) {
        cy.expect(
          invoiceLinesSection
            .find(MultiColumnListCell({ row: index, column: 'Receipt status' }))
            .has({ content: including(record.receiptStatus) }),
        );
      }

      if (record.paymentStatus) {
        cy.expect(
          invoiceLinesSection
            .find(MultiColumnListCell({ row: index, column: 'Payment status' }))
            .has({ content: including(record.paymentStatus) }),
        );
      }
    });
  },
  checkInvoiceDetails({
    title,
    invoiceInformation = [],
    invoiceLines,
    voucherExport = [],
    voucherInformation = [],
  } = {}) {
    if (title) {
      cy.expect(invoiceDetailsPane.has({ title: `Vendor invoice number - ${title}` }));
    }

    invoiceInformation.forEach(({ key, value }) => {
      cy.expect(informationSection.find(KeyValue(key)).has({ value: including(value) }));
    });

    voucherExport.forEach(({ key, value }) => {
      cy.expect(voucherExportDetailsSection.find(KeyValue(key)).has({ value: including(value) }));
    });

    voucherInformation.forEach(({ key, value }) => {
      cy.expect(voucherInformationSection.find(KeyValue(key)).has({ value: including(value) }));
    });

    if (invoiceLines) {
      cy.expect(
        invoiceLinesSection.has({
          text: including(`Total number of invoice lines: ${invoiceLines.length}`),
        }),
      );
      this.checkInvoiceLinesTableContent(invoiceLines);
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

  verifyStatus: (status) => {
    cy.expect(Pane({ id: 'pane-invoiceDetails' }).find(KeyValue('Status')).has({ value: status }));
  },

  downloadDocument: () => {
    cy.do(
      linksAndDocumentsSection
        .find(MultiColumnListCell({ column: 'Document name' }))
        .find(Button({ className: including('invoiceDocumentButton') }))
        .click(),
    );
  },
  verifyInvoicesList() {
    cy.expect(MultiColumnList({ id: 'invoices-list' }).exists());
  },
  verifyInvoicesListIncludeLinkExists(linkName) {
    cy.expect(
      MultiColumnList({ id: 'invoices-list' })
        .find(MultiColumnListCell({ content: linkName }))
        .find(Link())
        .exists(),
    );
  },
  selectInvoiceLineByName(linkName) {
    cy.do(
      MultiColumnList({ id: 'invoices-list' })
        .find(MultiColumnListCell({ content: linkName }))
        .find(Link())
        .click(),
    );

    return InvoiceLineDetails;
  },
};
