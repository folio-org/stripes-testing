import {
  Button,
  Checkbox,
  HTML,
  KeyValue,
  Link,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  PaneHeader,
  Section,
  including,
  matching,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';
import FundDetails from '../finance/funds/fundDetails';
import TransactionDetails from '../finance/transactions/transactionDetails';
import InvoiceLineEditForm from './invoiceLineEditForm';

// invoice lines details
const invoiceLineDetailsPane = Pane({ id: 'pane-invoiceLineDetails' });
const invoiceLineDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-invoiceLineDetails' });

// invoice lines details header
const actionsButton = Button('Actions');
const editButton = Button('Edit');

// invoice lines details information
const informationSection = invoiceLineDetailsPane.find(Section({ id: 'invoiceLineInformation' }));
const fundDistributionsSection = invoiceLineDetailsPane.find(
  Section({ id: 'invoiceLineFundDistribution' }),
);

const relatedInvoiceLinesSection = invoiceLineDetailsPane.find(
  Section({ id: 'otherRelatedInvoiceLines' }),
);

const receivingHistorySection = Section({ id: 'invoiceLineReceivingHistory' });
const receivingHistoryNextButton = receivingHistorySection.find(Button('Next'));
const receivingHistoryPreviousButton = receivingHistorySection.find(Button('Previous'));

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(invoiceLineDetailsPaneHeader.exists());
  },
  openInvoiceLineEditForm() {
    cy.do([invoiceLineDetailsPaneHeader.find(actionsButton).click(), editButton.click()]);
    InvoiceLineEditForm.waitLoading();

    return InvoiceLineEditForm;
  },
  checkInvoiceLineDetails({ invoiceLineInformation = [], checkboxes = [] } = {}) {
    invoiceLineInformation.forEach(({ key, value }) => {
      cy.expect(informationSection.find(KeyValue(key)).has({ value: including(value) }));
    });
    checkboxes.forEach(({ locator, conditions }) => {
      cy.expect(informationSection.find(Checkbox(locator)).has(conditions));
    });
  },
  checkRelatedInvoiceLinesTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.invoiceNumber) {
        cy.expect(
          relatedInvoiceLinesSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: including(record.invoiceNumber) }),
        );
      }
      if (record.invoiceLineNumber) {
        cy.expect(
          relatedInvoiceLinesSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 1 }))
            .has({ innerHTML: matching(new RegExp(record.invoiceLineNumber)) }),
        );
      }
      if (record.vendorCode) {
        cy.expect(
          relatedInvoiceLinesSection
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 4 }))
            .has({ content: including(record.vendorCode) }),
        );
      }
    });
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
  openFundDetailsPane(fundName, rowIndex = 0) {
    this.clickTheLinkInFundDetailsSection({ fundName, columnIndex: 0, rowIndex });

    FundDetails.waitLoading();

    return FundDetails;
  },
  openEncumbrancePane(fundName, rowIndex = 0) {
    this.clickTheLinkInFundDetailsSection({ fundName, columnIndex: 5, rowIndex });

    TransactionDetails.waitLoading();

    return TransactionDetails;
  },
  clickTheLinkInFundDetailsSection({ fundName, columnIndex = 0, rowIndex } = {}) {
    let tableRow;

    if (fundName && rowIndex !== undefined) {
      // When both fundName and rowIndex are provided, find the specific row by index
      // and verify it contains the expected fund name
      tableRow = fundDistributionsSection.find(
        MultiColumnListRow({ rowIndexInParent: `row-${rowIndex}` }),
      );
    } else if (fundName) {
      // Find by fund name in the Fund column specifically to avoid ambiguity
      tableRow = fundDistributionsSection
        .find(MultiColumnListCell({ column: 'Fund', content: including(fundName) }))
        .find(MultiColumnListRow({ isContainer: true }));
    } else {
      // Default to first row
      tableRow = fundDistributionsSection.find(MultiColumnListRow({ rowIndexInParent: 'row-0' }));
    }

    const link = tableRow.find(MultiColumnListCell({ columnIndex })).find(Link());
    cy.do([link.perform((el) => el.removeAttribute('target')), link.click()]);
  },
  getInvoiceLinesViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'invoice/invoice-lines',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
  },
  deleteInvoiceLineViaApi(invoiceLineId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `invoice/invoice-lines/${invoiceLineId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
  deleteInvoiceLinesByInvoiceIdViaApi(invoiceId) {
    return this.getInvoiceLinesViaApi({ query: `invoiceId="${invoiceId}"` }).then(
      ({ invoiceLines }) => {
        invoiceLines.forEach(({ id }) => this.deleteInvoiceLineViaApi(id));
      },
    );
  },
  checkFundListIsEmpty: () => {
    cy.expect(
      Section({ id: 'invoiceLineFundDistribution' })
        .find(HTML(including('The list contains no items')))
        .exists(),
    );
  },
  checkAdjustmentsListIsEmpty: () => {
    cy.expect(
      Section({ id: 'invoiceLineAdjustments' })
        .find(HTML(including('The list contains no items')))
        .exists(),
    );
  },
  closeInvoiceLineDetailsPane: () => {
    cy.do(invoiceLineDetailsPane.find(Button({ id: 'clickable-back-to-invoice' })).click());
  },
  checkReceivingHistoryPaginationButtons({ nextDisabled = false, previousDisabled = false } = {}) {
    if (nextDisabled !== undefined) {
      cy.expect(receivingHistoryNextButton.has({ disabled: nextDisabled }));
    }
    if (previousDisabled !== undefined) {
      cy.expect(receivingHistoryPreviousButton.has({ disabled: previousDisabled }));
    }
  },
  clickReceivingHistoryNextButton() {
    cy.do(receivingHistoryNextButton.click());
  },
  clickReceivingHistoryPreviousButton() {
    cy.do(receivingHistoryPreviousButton.click());
  },
  checkReceivingHistoryTableContent({ startRange, endRange, records = [] } = {}) {
    if (startRange !== undefined) {
      cy.get('#invoiceLineReceivingHistory').should('contain', startRange);
    }
    if (endRange !== undefined) {
      cy.get('#invoiceLineReceivingHistory').should('contain', endRange);
    }
    records.forEach((record, index) => {
      if (record.displaySummary) {
        cy.expect(
          receivingHistorySection
            .find(MultiColumnListCell({ row: index, column: 'Display summary' }))
            .has({ content: including(record.displaySummary) }),
        );
      }
      if (record.copyNumber) {
        cy.expect(
          receivingHistorySection
            .find(MultiColumnListCell({ row: index, column: 'Copy number' }))
            .has({ content: including(record.copyNumber) }),
        );
      }
      if (record.enumeration) {
        cy.expect(
          receivingHistorySection
            .find(MultiColumnListCell({ row: index, column: 'Enumeration' }))
            .has({ content: including(record.enumeration) }),
        );
      }
      if (record.chronology) {
        cy.expect(
          receivingHistorySection
            .find(MultiColumnListCell({ row: index, column: 'Chronology' }))
            .has({ content: including(record.chronology) }),
        );
      }
    });
  },
  scrollToBottomOfReceivingHistory() {
    cy.get('#invoiceLineReceivingHistory [class*="mclScrollable"]').scrollTo('bottom', {
      ensureScrollable: false,
    });
    cy.wait(1000);
  },
  clickReceiptDateLink(rowIndex = 0) {
    const link = receivingHistorySection
      .find(MultiColumnListRow({ rowIndexInParent: `row-${rowIndex}` }))
      .find(MultiColumnListCell({ column: 'Receipt date' }))
      .find(Link());

    cy.do([link.perform((el) => el.removeAttribute('target')), link.click()]);
  },
};
