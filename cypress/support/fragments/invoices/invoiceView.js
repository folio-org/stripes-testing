import { MultiColumnListCell, Section, including, KeyValue, Pane, HTML } from '../../../../interactors';
import invoices from './invoices';
import TopMenu from '../topMenu';

const vendorInvoiceNumber = '94999';
const expectedInvoiceDate = '11/24/2021';
const expectedInvoiceStatus = 'Open';
const expectedInvoiceSource = 'EDI';

export default {
  checkInvoiceDetails:() => {
    cy.do(Section().find(MultiColumnListCell(including(vendorInvoiceNumber))).perform(element => {
      const invoiceNumber = element.innerText.split('-')[0];

      cy.visit(TopMenu.invoicesPath);
      invoices.searchByNumber(invoiceNumber);
      cy.do(MultiColumnListCell({ row: 0, columnIndex: 0 }).click());

      const invoiceDate = KeyValue('Invoice date');
      const invoiceStatus = KeyValue('Status');
      const invoiceSource = KeyValue('Source');

      cy.expect(invoiceDate.has({ value: expectedInvoiceDate }));
      cy.expect(invoiceStatus.has({ value: expectedInvoiceStatus }));
      cy.expect(invoiceSource.has({ value: expectedInvoiceSource }));
    }));
  },

  checkQuantityInvoiceLinesInRecord:() => {
    cy.expect(Pane({ id:'pane-results' }).find(HTML(including('1,104 records found'))).exists());
  },
};
