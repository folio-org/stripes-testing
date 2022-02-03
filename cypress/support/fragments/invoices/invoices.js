import { Button, TextField, Selection, SelectionList, SearchField, KeyValue, Accordion, Pane, PaneHeader } from '../../../../interactors';
import Helper from '../finance/financeHelper';


const buttonNew = Button('New');
const saveAndClose = Button('Save & close');
const invoiceCreatedMessage = 'Invoice has been saved';
const vendorDetailsAccordionId = 'vendorDetails';
const actionsButton = Button('Actions');

export default {
  createDefaultInvoiceViaUi(invoice, vendorPrimaryAddress) {
    cy.do([
      buttonNew.click(),
      Selection('Status*').open(),
      SelectionList().select(invoice.status),
      TextField('Invoice date*').fillIn(invoice.invoiceDate),
      TextField('Vendor invoice number*').fillIn(invoice.invoiceNumber),
    ]);
    this.selectVendorOnUi(invoice.vendorName);
    cy.do([
      Selection('Accounting code*').open(),
      SelectionList().select(`Default (${invoice.accountingCode})`),
      Selection('Batch group*').open(),
      SelectionList().select(invoice.batchGroup),
    ]);
    this.checkVendorPrimaryAddress(vendorPrimaryAddress);
    cy.do(saveAndClose.click());
    Helper.checkCalloutMessage(invoiceCreatedMessage, 'success');
  },

  selectVendorOnUi: (organizationName) => {
    cy.do([
      Button({ id: 'vendorId-plugin' }).click(),
      SearchField({ id: 'input-record-search' }).fillIn(organizationName),
      Button('Search').click()
    ]);
    Helper.selectFromResultsList();
  },

  checkVendorPrimaryAddress: (vendorPrimaryAddress) => {
    cy.expect(KeyValue({ value: vendorPrimaryAddress.addressLine1 }).exists());
    cy.expect(KeyValue({ value: vendorPrimaryAddress.addressLine2 }).exists());
    cy.expect(KeyValue({ value: vendorPrimaryAddress.city }).exists());
    cy.expect(KeyValue({ value: vendorPrimaryAddress.zipCode }).exists());
    if (vendorPrimaryAddress.country === 'USA') {
      cy.expect(KeyValue({ value: 'United States' }).exists());
    } else {
      cy.expect(KeyValue({ value: vendorPrimaryAddress.country }).exists());
    }
    cy.expect(KeyValue({ value: vendorPrimaryAddress.language }).exists());
  },

  checkCreatedInvoice(invoice, vendorPrimaryAddress) {
    this.checkVendorPrimaryAddress(vendorPrimaryAddress);
    cy.expect(Pane({ id: 'pane-invoiceDetails' }).exists());
    cy.expect(Accordion({ id: vendorDetailsAccordionId }).find(KeyValue({ value: invoice.invoiceNumber })).exists());
    cy.expect(Accordion({ id: vendorDetailsAccordionId }).find(KeyValue({ value: invoice.vendorName })).exists());
    cy.expect(Accordion({ id: vendorDetailsAccordionId }).find(KeyValue({ value: invoice.accountingCode })).exists());
  },

  deleteBudgetViaActions() {
    cy.do([
      PaneHeader({ id: 'paneHeaderpane-invoiceDetails' })
        .find(actionsButton).click(),
      Button('Delete').click(),
      Button('Delete', { id:'clickable-delete-invoice-confirmation-confirm' }).click()
    ]);
  },
};
