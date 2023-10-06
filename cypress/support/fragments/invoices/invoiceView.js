import {
  MultiColumnListCell,
  MultiColumnListRow,
  Section,
  including,
  KeyValue,
  Pane,
  HTML,
  MultiColumnList,
  Link,
  Button,
} from '../../../../interactors';
import invoices from './invoices';
import TopMenu from '../topMenu';
import InvoiceLineEditForm from './invoiceLineEditForm';

const vendorInvoiceNumber = '94999';
const expectedInvoiceDate = '11/24/2021';
const expectedInvoiceStatus = 'Open';
const expectedInvoiceSource = 'EDI';

const invoiceLinesSection = Section({ id: 'invoiceLines' });

const actionsButton = Button('Actions');
const newBlankLineButton = Button('New blank line');

export default {
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
  },
  openInvoiceLineEditForm() {
    cy.do([invoiceLinesSection.find(actionsButton).click(), newBlankLineButton.click()]);
    InvoiceLineEditForm.waitLoading();

    return InvoiceLineEditForm;
  },
  checkTableContent(records = []) {
    records.forEach((record, index) => {
      cy.expect([
        invoiceLinesSection
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(record.poNumber) }),
        invoiceLinesSection
          .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
          .find(MultiColumnListCell({ columnIndex: 2 }))
          .has({ content: including(record.description) }),
      ]);
    });
  },

  checkInvoiceDetails(invoiceNumber) {
    cy.do(
      Section()
        .find(MultiColumnListCell(including(invoiceNumber)))
        .perform((element) => {
          const invoiceOfNumber = element.innerText.split('-')[0];

          cy.visit(TopMenu.invoicesPath);
          invoices.searchByNumber(invoiceOfNumber);
          cy.do(
            MultiColumnList({ id: 'invoices-list' })
              .find(MultiColumnListCell({ row: 0, columnIndex: 0 }))
              .find(Link(invoiceNumber))
              .click(),
          );

          const invoiceDate = KeyValue('Invoice date');
          const invoiceStatus = KeyValue('Status');
          const invoiceSource = KeyValue('Source');

          cy.expect(invoiceDate.has({ value: expectedInvoiceDate }));
          cy.expect(invoiceStatus.has({ value: expectedInvoiceStatus }));
          cy.expect(invoiceSource.has({ value: expectedInvoiceSource }));
        }),
    );
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

  vendorInvoiceNumber,
};
