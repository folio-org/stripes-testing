import { MultiColumnListCell, Section, including, KeyValue } from '../../../../interactors';
import invoices from '../invoices/invoices';
import TopMenu from '../topMenu';

const vendorInvoiceNumber = '49072';
const expectedInvoiceDate = '10/15/2021';
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
};
