import {
  Button,
  TextField,
  Selection,
  SelectionList,
  SearchField,
  KeyValue,
  Accordion,
  Pane,
  PaneHeader,
  MultiColumnListCell,
  Modal,
  Checkbox,
  MultiColumnList,
  MultiColumnListRow,
  Select
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import Helper from '../finance/financeHelper';


const buttonNew = Button('New');
const saveAndClose = Button('Save & close');
const invoiceStates = {
  invoiceCreatedMessage: 'Invoice has been saved',
  invoiceLineCreatedMessage: 'Invoice line has been saved',
  InvoiceApprovedMessage: 'Invoice has been approved successfully',
  InvoicePaidMessage: 'Invoice has been paid successfully',
  InvoiceDeletedMessage: 'Invoice has been deleted'
};
const vendorDetailsAccordionId = 'vendorDetails';
const invoiceLinesAccordionId = 'invoiceLines';
const actionsButton = Button('Actions');
const submitButton = Button('Submit');
const searchButton = Button('Search');
const invoiceDetailsPaneId = 'paneHeaderpane-invoiceDetails';
const searhInputId = 'input-record-search';

export default {
  createDefaultInvoice(invoice, vendorPrimaryAddress) {
    cy.do(actionsButton.click());
    cy.expect(buttonNew.exists());
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
    InteractorsTools.checkCalloutMessage(invoiceStates.invoiceCreatedMessage);
  },

  selectVendorOnUi: (organizationName) => {
    cy.do([
      Button({ id: 'vendorId-plugin' }).click(),
      SearchField({ id: searhInputId }).fillIn(organizationName),
      searchButton.click()
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

  deleteInvoiceViaActions() {
    cy.do([
      PaneHeader({ id: invoiceDetailsPaneId }).find(actionsButton).click(),
      Button('Delete').click(),
    ]);
  },

  confirmInvoiceDeletion: () => {
    cy.do(Button('Delete', { id: 'clickable-delete-invoice-confirmation-confirm' }).click());
    InteractorsTools.checkCalloutMessage(invoiceStates.InvoiceDeletedMessage);
  },

  createInvoiceLine: (invoiceLine) => {
    cy.do(Accordion({ id: invoiceLinesAccordionId }).find(actionsButton).click());
    cy.do(Button('New blank line').click());
    // TODO: update using interactors once we will be able to pass negative value into text field
    cy.xpath('//*[@id="subTotal"]').type(invoiceLine.subTotal);
    cy.do([
      TextField('Description*').fillIn(invoiceLine.description),
      TextField('Quantity*').fillIn(invoiceLine.quantity.toString()),
      saveAndClose.click()
    ]);
    InteractorsTools.checkCalloutMessage(invoiceStates.invoiceLineCreatedMessage);
  },

  createInvoiceLineFromPol: (orderNumber, rowNumber = 0) => {
    cy.do([
      Accordion({ id: invoiceLinesAccordionId }).find(actionsButton).click(),
      Button('Add line from POL').click()
    ]);
    cy.expect(Modal('Select order lines').exists());
    cy.do([
      Modal('Select order lines').find(SearchField({ id: searhInputId })).fillIn(orderNumber),
      Modal('Select order lines').find(searchButton).click(),
      Checkbox({ ariaLabel: `record ${rowNumber} checkbox` }).clickInput(),
      Button('Save').click()
    ]);
  },

  checkInvoiceLine: (invoiceLine, currency = '$') => {
    cy.expect(Accordion({ id: invoiceLinesAccordionId }).exists());
    cy.expect(Accordion({ id: invoiceLinesAccordionId }).find(MultiColumnListCell({ content: invoiceLine.description })).exists());
    cy.expect(Accordion({ id: invoiceLinesAccordionId }).find(MultiColumnListCell({ content: invoiceLine.quantity.toString() })).exists());
    cy.expect(Accordion({ id: invoiceLinesAccordionId }).find(MultiColumnListCell({ content: currency.concat(invoiceLine.subTotal.toFixed(2)) })).exists());
  },

  addFundDistributionToLine: (invoiceLine, fund) => {
    cy.do([
      Accordion({ id: invoiceLinesAccordionId }).find(MultiColumnListCell({ content: invoiceLine.description })).click(),
      PaneHeader({ id: 'paneHeaderpane-invoiceLineDetails' })
        .find(actionsButton).click(),
      Button('Edit').click(),
      Button({ id: 'fundDistributions-add-button' }).click(),
      Selection('Fund ID*').open(),
      SelectionList().select((fund.name).concat(' ', '(', fund.code, ')')),
      saveAndClose.click()
    ]);
    InteractorsTools.checkCalloutMessage(invoiceStates.invoiceLineCreatedMessage);
  },

  approveInvoice: () => {
    cy.do([
      PaneHeader({ id: invoiceDetailsPaneId })
        .find(actionsButton).click(),
      Button('Approve').click(),
      submitButton.click()
    ]);
    InteractorsTools.checkCalloutMessage(invoiceStates.InvoiceApprovedMessage);
  },

  searchByNumber: (invoiceNumber) => {
    cy.do([
      SearchField({ id: searhInputId }).selectIndex('Vendor invoice number'),
      SearchField({ id: searhInputId }).fillIn(invoiceNumber),
      searchButton.click(),
    ]);
  },

  payInvoice: () => {
    cy.do([
      PaneHeader({ id: invoiceDetailsPaneId })
        .find(actionsButton).click(),
      Button('Pay').click(),
      submitButton.click()
    ]);
    InteractorsTools.checkCalloutMessage(invoiceStates.InvoicePaidMessage);
  },

  updateCurrency: (currency) => {
    cy.do([
      PaneHeader({ id: invoiceDetailsPaneId })
        .find(actionsButton).click(),
      Button('Edit').click(),
      Selection('Currency*').open(),
      SelectionList().select(currency),
      saveAndClose.click()
    ]);
    InteractorsTools.checkCalloutMessage(invoiceStates.invoiceCreatedMessage);
  },

  checkConfirmationalPopup: () => {
    cy.expect(Modal({ id: 'invoice-line-currency-confirmation' }).exists());
  },

  applyConfirmationalPopup: () => {
    cy.do(Button('Confirm').click());
  },

  checkInvoiceCurrency: (currencyShortName) => {
    switch (currencyShortName) {
      // TODO: add other currencies if needed
      case 'USD':
        cy.expect(Accordion({ id: 'extendedInformation' }).find(KeyValue({ value: 'US Dollar' })).exists());
        break;
      case 'EUR':
        cy.expect(Accordion({ id: 'extendedInformation' }).find(KeyValue({ value: 'Euro' })).exists());
        break;
      default:
        cy.log(`No such currency short name like ${currencyShortName}`);
    }
  },

  openPolSearchPlugin: () => {
    cy.do([
      Accordion({ id: invoiceLinesAccordionId }).find(actionsButton).click(),
      Button('Add line from POL').click()
    ]);
    cy.expect(Modal('Select order lines').exists());
  },

  checkSearchPolPlugin: (searchParamsMap, titleOrPackage) => {
    for (const [key, value] of searchParamsMap.entries()) {
      cy.do([
        Modal('Select order lines').find(SearchField({ id: searhInputId })).selectIndex(key),
        Modal('Select order lines').find(SearchField({ id: searhInputId })).fillIn(value),
        Modal('Select order lines').find(searchButton).click()
      ]);
      // verify that first row in the result list contains related order line title
      cy.expect(MultiColumnList({ id: 'list-plugin-find-records' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 2 }))
        .has({ content: titleOrPackage }));
      cy.do([
        Button({ id: 'reset-find-records-filters' }).click()
      ]);
      // TODO: remove waiter - currenty it's a workaround for incorrect selection from search list
      cy.wait(1000);
    }
  },

  closeSearchPlugin: () => {
    cy.do(Button('Close').click());
  },

  voucherExport: () => {
    cy.do([
      PaneHeader({ id: 'paneHeaderinvoice-results-pane' })
        .find(actionsButton).click(),
      Button('Voucher export').click(),
      Select().choose('Amherst (AC)'),
      Button('Run manual export').click(),
      Button({ id: 'clickable-run-manual-export-confirmation-confirm' }).click(),
    ]);
    cy.wait(2000);
    cy.do(MultiColumnList({ id: 'batch-voucher-exports' })
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 3 }))
      .find(Button({ icon: 'download' }))
      .click());
  },
  getSearchParamsMap(orderNumber, orderLine) {
    const searchParamsMap = new Map();
    searchParamsMap.set('Keyword', orderNumber)
      .set('Contributor', orderLine.contributors[0].contributor)
      .set('PO line number', orderNumber.toString().concat('-1'))
      .set('Requester', orderLine.requester)
      .set('Title or package name', orderLine.titleOrPackage)
      .set('Publisher', orderLine.publisher)
      .set('Vendor account', orderLine.vendorDetail.vendorAccount)
      .set('Vendor reference number', orderLine.vendorDetail.referenceNumbers[0].refNumber)
      .set('Donor', orderLine.donor)
      .set('Selector', orderLine.selector)
      .set('Volumes', orderLine.physical.volumes[0])
      .set('Product ID', orderLine.details.productIds[0].productId)
      .set('Product ID ISBN', orderLine.details.productIds[0].productId);
    return searchParamsMap;
  }
};
