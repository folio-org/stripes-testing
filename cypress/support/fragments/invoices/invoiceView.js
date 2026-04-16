import {
  Accordion,
  Button,
  HTML,
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
import {
  DEFAULT_WAIT_TIME,
  INVOICE_LEVEL_ADJUSTMENTS_COLUMNS,
  INVOICE_LEVEL_FUND_DISTRIBUTION_COLUMNS,
  INVOICE_POL_PAYMENT_STATUSES,
} from '../../constants';
import interactorsTools from '../../utils/interactorsTools';
import InvoiceEditForm from './invoiceEditForm';
import InvoiceLineDetails from './invoiceLineDetails';
import InvoiceLineEditForm from './invoiceLineEditForm';

import ApproveInvoiceModal from './modal/approveInvoiceModal';
import CancelInvoiceModal from './modal/cancelInvoiceModal';
import PayInvoiceModal from './modal/payInvoiceModal';
import SelectOrderLinesModal from './modal/selectOrderLinesModal';
import InvoiceStates from './invoiceStates';
import UpdatePOLinePaymentStatusModal from './modal/updatePOLinePaymentStatusModal';
import FundDetails from '../finance/funds/fundDetails';

const invoiceDetailsPane = Pane({ id: 'pane-invoiceDetails' });

// header section
const invoiceDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-invoiceDetails' });
const actionsButton = Button('Actions');
const newBlankLineButton = Button('New blank line');
const cancelButton = Button('Cancel');
// invoice lines section
const invoiceLinesSection = Section({ id: 'invoiceLines' });

// Links & documents section
const linksAndDocumentsSection = Section({ id: 'documents' });

// voucher details
const voucherExportDetailsSection = invoiceDetailsPane.find(Section({ id: 'batchVoucherExport' }));
const voucherInformationSection = invoiceDetailsPane.find(Section({ id: 'voucher' }));
const vendorDetailsSection = invoiceDetailsPane.find(Section({ id: 'vendorDetails' }));
const invoiceFundDistributionSection = invoiceDetailsPane.find(
  Section({ id: 'invoiceFundDistribution' }),
);
const invoiceLevelAdjustmentsSection = invoiceDetailsPane.find(
  Section({ id: 'invoiceAdjustments' }),
);

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(invoiceDetailsPane.exists());
  },
  expandActionsDropdown() {
    cy.wait(4000);
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
    invoiceFundDistributions,
    invoiceLevelAdjustments,
    vendorDetails = [],
    voucherExport = [],
    voucherInformation = [],
    vendorDetailsInformation = [],
  } = {}) {
    if (title) {
      cy.expect(invoiceDetailsPane.has({ title: `Vendor invoice number - ${title}` }));
    }

    invoiceInformation.forEach(({ key, value }) => {
      cy.contains('div[class^="kvRoot"]', key)
        .parent()
        .within(() => {
          cy.get('[data-test-kv-value="true"]')
            .invoke('text')
            .then((text) => {
              const normalizedText = Cypress._.trim(Cypress._.replace(text, /\u00a0/g, ' '));
              cy.wrap(normalizedText).should('include', value);
            });
        });
    });

    vendorDetails.forEach(({ key, value }) => {
      cy.expect(vendorDetailsSection.find(KeyValue(key)).has({ value: including(value) }));
    });

    voucherExport.forEach(({ key, value }) => {
      cy.expect(voucherExportDetailsSection.find(KeyValue(key)).has({ value: including(value) }));
    });

    voucherInformation.forEach(({ key, value }) => {
      cy.expect(voucherInformationSection.find(KeyValue(key)).has({ value: including(value) }));
    });

    vendorDetailsInformation.forEach(({ key, value }) => {
      cy.expect(vendorDetailsSection.find(KeyValue(key)).has({ value: including(value) }));
    });

    if (invoiceLines) {
      cy.expect(
        invoiceLinesSection.has({
          text: including(`Total number of invoice lines: ${invoiceLines.length}`),
        }),
      );
      this.checkInvoiceLinesTableContent(invoiceLines);
    }

    if (invoiceFundDistributions) {
      this.checkInvoiceFundDisributionTableContent(invoiceFundDistributions);
    }

    if (invoiceLevelAdjustments) {
      this.checkInvoiceLevelAdjustmentsTableContent(invoiceLevelAdjustments);
    }
  },

  checkInvoiceFundDistributionColumnItem(rowIndex, columnName, value) {
    cy.expect(
      invoiceFundDistributionSection
        .find(MultiColumnListCell({ row: rowIndex, column: columnName }))
        .has({ content: including(value) }),
    );
  },

  checkInvoiceFundDisributionTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.adjustment) {
        this.checkInvoiceFundDistributionColumnItem(
          index,
          INVOICE_LEVEL_FUND_DISTRIBUTION_COLUMNS.ADJUSTMENT,
          record.adjustment,
        );
      }

      if (record.fund) {
        this.checkInvoiceFundDistributionColumnItem(
          index,
          INVOICE_LEVEL_FUND_DISTRIBUTION_COLUMNS.FUND,
          record.fund,
        );
      }

      if (record.expenseClass) {
        this.checkInvoiceFundDistributionColumnItem(
          index,
          INVOICE_LEVEL_FUND_DISTRIBUTION_COLUMNS.EXPENSE_CLASS,
          record.expenseClass,
        );
      }

      if (record.value) {
        this.checkInvoiceFundDistributionColumnItem(
          index,
          INVOICE_LEVEL_FUND_DISTRIBUTION_COLUMNS.VALUE,
          record.value,
        );
      }

      if (record.amount) {
        this.checkInvoiceFundDistributionColumnItem(
          index,
          INVOICE_LEVEL_FUND_DISTRIBUTION_COLUMNS.AMOUNT,
          record.amount,
        );
      }
    });
  },

  checkInvoiceLevelAdjustmentColumnItem(rowIndex, columnName, value) {
    cy.expect(
      invoiceLevelAdjustmentsSection
        .find(MultiColumnListCell({ row: rowIndex, column: columnName }))
        .has({ content: including(value) }),
    );
  },

  checkInvoiceLevelAdjustmentsTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.description) {
        this.checkInvoiceLevelAdjustmentColumnItem(
          index,
          INVOICE_LEVEL_ADJUSTMENTS_COLUMNS.DESCRIPTION,
          record.description,
        );
      }

      if (record.value) {
        this.checkInvoiceLevelAdjustmentColumnItem(
          index,
          INVOICE_LEVEL_ADJUSTMENTS_COLUMNS.VALUE,
          record.value,
        );
      }

      if (record.prorate) {
        this.checkInvoiceLevelAdjustmentColumnItem(
          index,
          INVOICE_LEVEL_ADJUSTMENTS_COLUMNS.PRORATE,
          record.prorate,
        );
      }

      if (record.relationToTotal) {
        this.checkInvoiceLevelAdjustmentColumnItem(
          index,
          INVOICE_LEVEL_ADJUSTMENTS_COLUMNS.RELATION_TO_TOTAL,
          record.relationToTotal,
        );
      }
    });
  },

  checkFieldsHasCopyIcon(fields = []) {
    fields.forEach(({ label }) => {
      cy.expect(
        invoiceDetailsPane
          .find(KeyValue(label))
          .find(Button({ icon: 'clipboard' }))
          .exists(),
      );
    });
  },
  checkDocumentsSection({ linkName, externalUrl, documentName, shouldExpand = true } = {}) {
    if (shouldExpand) {
      cy.do(linksAndDocumentsSection.toggle());
    }

    if (linkName) {
      cy.expect(
        linksAndDocumentsSection.find(MultiColumnListCell({ column: 'Link name' })).has({
          content: linkName,
        }),
      );
    }
    if (externalUrl) {
      cy.expect(
        linksAndDocumentsSection.find(MultiColumnListCell({ column: 'External URL' })).has({
          content: externalUrl,
        }),
      );
    }
    if (documentName) {
      cy.expect(
        linksAndDocumentsSection.find(MultiColumnListCell({ column: 'Document name' })).has({
          content: documentName,
        }),
      );
    }
  },
  copyOrderNumber(vendorInvoiceNo) {
    cy.do(
      invoiceDetailsPane
        .find(KeyValue('Vendor invoice number'))
        .find(Button({ icon: 'clipboard' }))
        .click(),
    );

    interactorsTools.checkCalloutMessage(`Successfully copied "${vendorInvoiceNo}" to clipboard.`);
  },
  approveInvoice({ isApprovePayEnabled = false } = {}) {
    cy.do([
      invoiceDetailsPaneHeader.find(actionsButton).click(),
      Button(isApprovePayEnabled ? 'Approve & pay' : 'Approve').click(),
    ]);

    ApproveInvoiceModal.verifyModalView({ isApprovePayEnabled });
    ApproveInvoiceModal.clickSubmitButton({ isApprovePayEnabled });
  },
  clickApproveAndPayInvoice({ isApprovePayEnabled = false } = {}) {
    cy.do([
      cy.wait(2000),
      invoiceDetailsPaneHeader.find(actionsButton).click(),
      Button(isApprovePayEnabled ? 'Approve & pay' : 'Approve').click(),
    ]);
  },
  payInvoice() {
    cy.do([invoiceDetailsPaneHeader.find(actionsButton).click(), Button('Pay').click()]);

    PayInvoiceModal.verifyModalView();
    PayInvoiceModal.clickSubmitButton();
  },
  cancelInvoice() {
    cy.do([invoiceDetailsPaneHeader.find(actionsButton).click(), cancelButton.click()]);
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
  checkInvoiceCanNotBeApprovedWarning(warningMessage) {
    cy.expect(invoiceDetailsPane.has({ text: including(warningMessage) }));
  },

  checkInvoiceWarningAbsent(warningText) {
    cy.expect(invoiceDetailsPane.find(HTML(including(warningText))).absent());
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
  verifyInvoiceLinkExists(linkName) {
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
  verifyWarningMessage(message) {
    cy.expect(HTML(including(message)).exists());
  },

  verifyCurrency(currency) {
    cy.do(Accordion({ id: 'extendedInformation' }).clickHeader());
    cy.expect(KeyValue('Currency').has({ value: currency }));
  },

  clickCancelInActionsMenu() {
    cy.do([invoiceDetailsPaneHeader.find(actionsButton).click(), cancelButton.click()]);
  },

  cancelInvoiceWithUpdatePOLPaymentStatus({
    errorMessage,
    status = INVOICE_POL_PAYMENT_STATUSES.CANCELLED,
  } = {}) {
    this.clickCancelInActionsMenu();
    CancelInvoiceModal.clickSubmitButton(false);
    UpdatePOLinePaymentStatusModal.verifyModalView();
    UpdatePOLinePaymentStatusModal.selectPaymentStatus(status);
    UpdatePOLinePaymentStatusModal.clickSubmitButton();

    if (errorMessage) {
      interactorsTools.checkCalloutErrorMessage(errorMessage);
    } else {
      interactorsTools.checkCalloutMessage(InvoiceStates.invoiceCancelledMessage);
    }
  },

  checkErrorInvoiceApiResponse(
    interception,
    {
      expectedStatus,
      expectedMessage,
      expectedErrorCode,
      expectedFundId,
      expectedFiscalYearId,
    } = {},
  ) {
    expect(interception.response.statusCode).to.equal(expectedStatus);

    if (expectedErrorCode) {
      expect(interception.response.body.errors[0].code).to.equal(expectedErrorCode);
    }

    if (expectedMessage) {
      expect(interception.response.body.errors[0].message).to.include(expectedMessage);
    }

    if (expectedFundId) {
      const fundIdParam = interception.response.body.errors[0].parameters.find(
        (param) => param.key === 'fundId',
      );
      expect(fundIdParam.value).to.equal(expectedFundId);
    }

    if (expectedFiscalYearId) {
      const fiscalYearIdParam = interception.response.body.errors[0].parameters.find(
        (param) => param.key === 'fiscalYearId',
      );
      expect(fiscalYearIdParam.value).to.equal(expectedFiscalYearId);
    }
  },

  selectFundInInvoiceLevelFundDistributionSection(fundNameCode, index = 0) {
    const link = invoiceFundDistributionSection
      .find(
        MultiColumnListCell({ row: index, column: INVOICE_LEVEL_FUND_DISTRIBUTION_COLUMNS.FUND }),
      )
      .find(Link(fundNameCode));
    cy.do([link.perform((el) => el.removeAttribute('target')), link.click()]);
    FundDetails.waitLoading();
  },
};
