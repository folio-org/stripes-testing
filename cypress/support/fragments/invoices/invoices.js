import {
  Accordion,
  Button,
  Checkbox,
  KeyValue,
  Link,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  PaneHeader,
  SearchField,
  Section,
  Select,
  Selection,
  SelectionList,
  SelectionOption,
  TextField
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import Helper from '../finance/financeHelper';

const buttonNew = Button('New');
const saveAndClose = Button('Save & close');
const invoiceStates = {
  invoiceCreatedMessage: 'Invoice has been saved',
  invoiceLineCreatedMessage: 'Invoice line has been saved',
  invoiceApprovedMessage: 'Invoice has been approved successfully',
  invoicePaidMessage: 'Invoice has been paid successfully',
  invoiceDeletedMessage: 'Invoice has been deleted',
};
const vendorDetailsAccordionId = 'vendorDetails';
const invoiceLinesAccordionId = 'invoiceLines';
const actionsButton = Button('Actions');
const submitButton = Button('Submit');
const searchButton = Button('Search');
const invoiceDetailsPaneId = 'paneHeaderpane-invoiceDetails';
const searchInputId = 'input-record-search';
const numberOfSearchResultsHeader =
  '//*[@id="paneHeaderinvoice-results-pane-subtitle"]/span';
const zeroResultsFoundText = '0 records found';
const searchForm = SearchField({ id: 'input-record-search' });
const resetButton = Button({ id: 'reset-invoice-filters' });
const invoiceLineDetailsPane = PaneHeader({
  id: 'paneHeaderpane-invoiceLineDetails',
});
const deleteButton = Button('Delete');
const invoiceFiltersSection = Section({ id: 'invoice-filters-pane' });
const batchGroupFilterSection = Section({ id: 'batchGroupId' });
const fundCodeFilterSection = Section({ id: 'fundCode' });
const fiscalYearFilterSection = Section({ id: 'fiscalYearId' });
const invoiceDateFilterSection = Section({ id: 'invoiceDate' });
const approvalDateFilterSection = Section({ id: 'approvalDate' });

export default {
  selectFolio() {
    cy.do([
      Button({ id: 'accordion-toggle-button-status' }).click(),
      Checkbox({ id: 'clickable-filter-status-paid' }).click(),
      Checkbox({ id: 'clickable-filter-status-approved' }).click(),
      Button({ id: 'accordion-toggle-button-batchGroupId' }).click(),
      Button({ id: 'batchGroupId-selection' }).click(),
      SelectionList().select('FOLIO'),
    ]);
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  createDefaultInvoice(invoice, vendorPrimaryAddress) {
    cy.wait(4000);
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
      Button({ name: 'accountNo' }).click(),
      SelectionList().select(`Default (${invoice.accountingCode})`),
      Selection('Batch group*').open(),
      SelectionList().select(invoice.batchGroup),
      Select({ id: 'invoice-payment-method' }).choose('Cash'),
      Checkbox('Export to accounting').checked(false).click()
    ]);
    this.checkVendorPrimaryAddress(vendorPrimaryAddress);
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(invoiceStates.invoiceCreatedMessage);
  },

  createRolloverInvoice(invoice, organization) {
    cy.do(actionsButton.click());
    cy.expect(buttonNew.exists());
    cy.do([
      buttonNew.click(),
      Selection('Status*').open(),
      SelectionList().select(invoice.status),
      TextField('Invoice date*').fillIn(invoice.invoiceDate),
      TextField('Vendor invoice number*').fillIn(invoice.invoiceNumber),
    ]);
    this.selectVendorOnUi(organization);
    cy.do([
      Selection('Batch group*').open(),
      SelectionList().select('FOLIO'),
      Select({ id: 'invoice-payment-method' }).choose('Cash'),
      Checkbox('Export to accounting').checked(false),
    ]);
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(invoiceStates.invoiceCreatedMessage);
  },

  createSpecialInvoice(invoice) {
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
      Selection('Accounting code').open(),
      SelectionList().select(`Default (${invoice.accountingCode})`),
      Selection('Batch group*').open(),
      SelectionList().select(invoice.batchGroup),
      Select({ id: 'invoice-payment-method' }).choose('Cash'),
      Checkbox('Export to accounting').click(),
    ]);
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(invoiceStates.invoiceCreatedMessage);
  },

  selectVendorOnUi: (organizationName) => {
    cy.do([
      Button('Organization look-up').click(),
      SearchField({ id: searchInputId }).fillIn(organizationName),
      searchButton.click(),
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
    cy.expect(
      Accordion({ id: vendorDetailsAccordionId })
        .find(KeyValue({ value: invoice.invoiceNumber }))
        .exists()
    );
    cy.expect(
      Accordion({ id: vendorDetailsAccordionId })
        .find(KeyValue({ value: invoice.vendorName }))
        .exists()
    );
    cy.expect(
      Accordion({ id: vendorDetailsAccordionId })
        .find(KeyValue({ value: invoice.accountingCode }))
        .exists()
    );
  },

  deleteInvoiceViaActions() {
    cy.do([
      PaneHeader({ id: invoiceDetailsPaneId }).find(actionsButton).click(),
      deleteButton.click(),
    ]);
  },

  deleteInvoiceLineViaActions() {
    cy.do([
      invoiceLineDetailsPane.find(actionsButton).click(),
      deleteButton.click(),
      Modal({ id: 'delete-invoice-line-confirmation' })
        .find(deleteButton)
        .click(),
    ]);
  },

  confirmInvoiceDeletion: () => {
    cy.do(
      Button('Delete', {
        id: 'clickable-delete-invoice-confirmation-confirm',
      }).click()
    );
    InteractorsTools.checkCalloutMessage(invoiceStates.InvoiceDeletedMessage);
  },

  createInvoiceLine: (invoiceLine) => {
    cy.do(
      Accordion({ id: invoiceLinesAccordionId }).find(actionsButton).click()
    );
    cy.do(Button('New blank line').click());
    // TODO: update using interactors once we will be able to pass negative value into text field
    cy.xpath('//*[@id="subTotal"]').type(invoiceLine.subTotal);
    cy.do([
      TextField('Description*').fillIn(invoiceLine.description),
      TextField('Quantity*').fillIn(invoiceLine.quantity.toString()),
      saveAndClose.click(),
    ]);
    InteractorsTools.checkCalloutMessage(
      invoiceStates.invoiceLineCreatedMessage
    );
  },

  createInvoiceLinePOLLookUp: (orderNumber) => {
    cy.do(
      Accordion({ id: invoiceLinesAccordionId }).find(actionsButton).click()
    );
    cy.do(Button('New blank line').click());
    cy.do([
      Button('POL look-up').click(),
      Modal('Select order lines')
        .find(SearchField({ id: searchInputId }))
        .fillIn(orderNumber),
      searchButton.click(),
    ]);
    Helper.selectFromResultsList();
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(
      invoiceStates.invoiceLineCreatedMessage
    );
  },

  addLineFromPol: (orderNumber) => {
    cy.do([
      Accordion({ id: invoiceLinesAccordionId }).find(actionsButton).click(),
      Button('Add line from POL').click(),
      Modal('Select order lines').find(SearchField()).fillIn(orderNumber),
      MultiColumnListRow({ index: (rowNumber = 0) }).click(),
    ]);
  },

  createInvoiceLineFromPol: (orderNumber, rowNumber = 0) => {
    cy.do([
      Accordion({ id: invoiceLinesAccordionId }).find(actionsButton).click(),
      Button('Add line from POL').click(),
    ]);
    cy.expect(Modal('Select order lines').exists());
    cy.do([
      Modal('Select order lines')
        .find(SearchField({ id: searchInputId }))
        .fillIn(orderNumber),
      Modal('Select order lines').find(searchButton).click(),
      Checkbox({ ariaLabel: `record ${rowNumber} checkbox` }).clickInput(),
      Button('Save').click(),
    ]);
  },

  checkInvoiceLine: (invoiceLine, currency = '$') => {
    cy.expect(Accordion({ id: invoiceLinesAccordionId }).exists());
    cy.expect(
      Accordion({ id: invoiceLinesAccordionId })
        .find(MultiColumnListCell({ content: invoiceLine.description }))
        .exists()
    );
    cy.expect(
      Accordion({ id: invoiceLinesAccordionId })
        .find(MultiColumnListCell({ content: invoiceLine.quantity.toString() }))
        .exists()
    );
    cy.expect(
      Accordion({ id: invoiceLinesAccordionId })
        .find(
          MultiColumnListCell({
            content: currency.concat(invoiceLine.subTotal.toFixed(2)),
          })
        )
        .exists()
    );
  },

  addFundDistributionToLine: (invoiceLine, fund) => {
    cy.do([
      Accordion({ id: invoiceLinesAccordionId })
        .find(MultiColumnListCell({ content: invoiceLine.description }))
        .click(),
      invoiceLineDetailsPane.find(actionsButton).click(),
      Button('Edit').click(),
      Button({ id: 'fundDistributions-add-button' }).click(),
      Selection('Fund ID*').open(),
      SelectionList().select(fund.name.concat(' ', '(', fund.code, ')')),
      saveAndClose.click(),
    ]);
    InteractorsTools.checkCalloutMessage(
      invoiceStates.invoiceLineCreatedMessage
    );
  },

  addFundToLine: (fund) => {
    cy.do([
      Button({ id: 'fundDistributions-add-button' }).click(),
      Selection('Fund ID*').open(),
      SelectionList().select(fund.name.concat(' ', '(', fund.code, ')')),
      saveAndClose.click(),
    ]);
    InteractorsTools.checkCalloutMessage(
      invoiceStates.invoiceLineCreatedMessage
    );
  },

  deleteFundInInvoiceLine: () => {
    cy.do([
      Section({ id: 'invoiceLineForm-fundDistribution' })
        .find(Button({ icon: 'trash' }))
        .click(),
      saveAndClose.click(),
    ]);
    InteractorsTools.checkCalloutMessage(
      invoiceStates.invoiceLineCreatedMessage
    );
  },

  approveInvoice: () => {
    cy.do([
      PaneHeader({ id: invoiceDetailsPaneId }).find(actionsButton).click(),
      Button('Approve').click(),
      submitButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage(invoiceStates.InvoiceApprovedMessage);
  },

  searchByNumber: (invoiceNumber) => {
    cy.do([
      SearchField({ id: searchInputId }).selectIndex('Vendor invoice number'),
      SearchField({ id: searchInputId }).fillIn(invoiceNumber),
      searchButton.click(),
    ]);
  },

  searchByParameter(parameter, value) {
    cy.do([
      searchForm.selectIndex(parameter),
      searchForm.fillIn(value),
      Button('Search').click(),
    ]);
  },

  payInvoice: () => {
    cy.do([
      PaneHeader({ id: invoiceDetailsPaneId }).find(actionsButton).click(),
      Button('Pay').click(),
      submitButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage(invoiceStates.InvoicePaidMessage);
  },

  updateCurrency: (currency) => {
    cy.do([
      PaneHeader({ id: invoiceDetailsPaneId }).find(actionsButton).click(),
      Button('Edit').click(),
      Selection('Currency*').open(),
      SelectionList().select(currency),
      saveAndClose.click(),
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
        cy.expect(
          Accordion({ id: 'extendedInformation' })
            .find(KeyValue({ value: 'US Dollar' }))
            .exists()
        );
        break;
      case 'EUR':
        cy.expect(
          Accordion({ id: 'extendedInformation' })
            .find(KeyValue({ value: 'Euro' }))
            .exists()
        );
        break;
      default:
        cy.log(`No such currency short name like ${currencyShortName}`);
    }
  },

  openPolSearchPlugin: () => {
    cy.do([
      Accordion({ id: invoiceLinesAccordionId }).find(actionsButton).click(),
      Button('Add line from POL').click(),
    ]);
    cy.expect(Modal('Select order lines').exists());
  },

  checkSearchPolPlugin: (searchParamsMap, titleOrPackage) => {
    for (const [key, value] of searchParamsMap.entries()) {
      cy.do([
        Modal('Select order lines')
          .find(SearchField({ id: searchInputId }))
          .selectIndex(key),
        Modal('Select order lines')
          .find(SearchField({ id: searchInputId }))
          .fillIn(value),
        Modal('Select order lines').find(searchButton).click(),
      ]);
      // verify that first row in the result list contains related order line title
      cy.expect(
        MultiColumnList({ id: 'list-plugin-find-records' })
          .find(MultiColumnListRow({ index: 0 }))
          .find(MultiColumnListCell({ columnIndex: 2 }))
          .has({ content: titleOrPackage })
      );
      cy.do([Button({ id: 'reset-find-records-filters' }).click()]);
      // TODO: remove waiter - currenty it's a workaround for incorrect selection from search list
      cy.wait(1000);
    }
  },

  closeSearchPlugin: () => {
    cy.do(Button('Close').click());
  },

  voucherExport: (batchGroup) => {
    cy.do([
      PaneHeader({ id: 'paneHeaderinvoice-results-pane' })
        .find(actionsButton)
        .click(),
      Button('Voucher export').click(),
      Select().choose(batchGroup),
      Button('Run manual export').click(),
      Button({
        id: 'clickable-run-manual-export-confirmation-confirm',
      }).click(),
    ]);
    cy.wait(2000);
    cy.do(
      MultiColumnList({ id: 'batch-voucher-exports' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .find(Button({ icon: 'download' }))
        .click()
    );
  },

  voucherExportManualExport: (batchGroup) => {
    cy.do([
      PaneHeader({ id: 'paneHeaderinvoice-results-pane' })
        .find(actionsButton)
        .click(),
      Button('Voucher export').click(),
      Select().choose(batchGroup),
      Button('Run manual export').click(),
      Button({
        id: 'clickable-run-manual-export-confirmation-confirm',
      }).click(),
    ]);
    cy.wait(2000);
  },

  verifyDownloadButtonAndClick: () => {
    cy.expect(MultiColumnList({ id: 'batch-voucher-exports' })
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 3 }))
      .find(Button({ icon: 'download' }))
      .exists());
    cy.do(
      MultiColumnList({ id: 'batch-voucher-exports' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .find(Button({ icon: 'download' }))
        .click()
    );
  },

  getSearchParamsMap(orderNumber, orderLine) {
    const searchParamsMap = new Map();
    searchParamsMap
      .set('Keyword', orderNumber)
      .set('Contributor', orderLine.contributors[0].contributor)
      .set('PO line number', orderNumber.toString().concat('-1'))
      .set('Requester', orderLine.requester)
      .set('Title or package name', orderLine.titleOrPackage)
      .set('Publisher', orderLine.publisher)
      .set('Vendor account', orderLine.vendorDetail.vendorAccount)
      .set(
        'Vendor reference number',
        orderLine.vendorDetail.referenceNumbers[0].refNumber
      )
      .set('Donor', orderLine.donor)
      .set('Selector', orderLine.selector)
      .set('Volumes', orderLine.physical.volumes[0])
      .set('Product ID', orderLine.details.productIds[0].productId)
      .set('Product ID ISBN', orderLine.details.productIds[0].productId);
    return searchParamsMap;
  },

  waitLoading: () => {
    cy.expect(Pane({ id: 'invoice-results-pane' }).exists());
  },

  selectInvoiceLine: () => {
    cy.do(
      Section({ id: 'invoiceLines' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .click()
    );
  },

  cancelInvoice: () => {
    cy.do([
      PaneHeader({ id: invoiceDetailsPaneId }).find(actionsButton).click(),
      Button('Cancel').click(),
      submitButton.click(),
    ]);
  },

  selectInvoice: (invoiceNumber) => {
    cy.do(
      Pane({ id: 'invoice-results-pane' }).find(Link(invoiceNumber)).click()
    );
  },

  closeInvoiceDetailsPane: () => {
    cy.do(
      Pane({ id: 'pane-invoiceDetails' })
        .find(Button({ icon: 'times' }))
        .click()
    );
  },

  resetFilters: () => {
    cy.do(resetButton.click());
    cy.expect(resetButton.is({ disabled: true }));
  },

  editInvoiceLine: () => {
    cy.do([
      Section({ id: 'pane-invoiceLineDetails' }).find(actionsButton).click(),
      Button('Edit').click(),
    ]);
  },

  addAdjustment: (descriptionInput, valueInput, typeToggle, realtioToTotal) => {
    cy.do([
      Button({ id: 'adjustments-add-button' }).click(),
      TextField({ name: 'adjustments[0].description' }).fillIn(
        descriptionInput
      ),
      TextField({ name: 'adjustments[0].value' }).fillIn(valueInput),
      Section({ id: 'invoiceLineForm-adjustments' })
        .find(Button(typeToggle))
        .click(),
      Select({ name: 'adjustments[0].relationToTotal' }).choose(realtioToTotal),
      saveAndClose.click(),
    ]);
  },

  checkFundInInvoiceLine: (fund) => {
    cy.expect(
      Section({ id: 'invoiceLineFundDistribution' })
        .find(Link(`${fund.name}(${fund.code})`))
        .exists()
    );
  },

  selectStatusFilter: (status) => {
    cy.do([
      invoiceFiltersSection
        .find(Section({ id: 'status' }))
        .find(Button({ ariaLabel: 'Status filter list' }))
        .click(),
      Checkbox(status).click(),
    ]);
  },

  selectVendorFilter: (organization) => {
    cy.do([
      invoiceFiltersSection
        .find(Section({ id: 'vendorId' }))
        .find(Button({ ariaLabel: 'Vendor name filter list' }))
        .click(),
      Button('Organization look-up').click(),
      Modal('Select Organization')
        .find(SearchField({ id: searchInputId }))
        .fillIn(organization.name),
      searchButton.click(),
    ]);
    Helper.selectFromResultsList();
  },

  selectApprovalDateFilter: (dateFrom, dateTo) => {
    cy.do([
      invoiceFiltersSection
        .find(approvalDateFilterSection)
        .find(Button({ ariaLabel: 'Approval date filter list' }))
        .click(),
      approvalDateFilterSection
        .find(TextField({ name: 'startDate' }))
        .fillIn(dateFrom),
      approvalDateFilterSection
        .find(TextField({ name: 'endDate' }))
        .fillIn(dateTo),
      approvalDateFilterSection.find(Button('Apply')).click(),
    ]);
  },

  selectInvoiceDateFilter: (dateFrom, dateTo) => {
    cy.do([
      invoiceFiltersSection
        .find(invoiceDateFilterSection)
        .find(Button({ ariaLabel: 'Invoice date filter list' }))
        .click(),
      invoiceDateFilterSection
        .find(TextField({ name: 'startDate' }))
        .fillIn(dateFrom),
      invoiceDateFilterSection
        .find(TextField({ name: 'endDate' }))
        .fillIn(dateTo),
      invoiceDateFilterSection.find(Button('Apply')).click(),
    ]);
  },

  selectFundCodeFilter: (fundCode) => {
    cy.do([
      invoiceFiltersSection
        .find(fundCodeFilterSection)
        .find(Button({ ariaLabel: 'Fund code filter list' }))
        .click(),
      fundCodeFilterSection.find(Button({ id: 'fundCode-selection' })).click(),
      fundCodeFilterSection.find(SelectionOption(fundCode)).click(),
    ]);
  },

  selectFiscalYearFilter: (fiscalYear) => {
    cy.do([
      invoiceFiltersSection
        .find(fiscalYearFilterSection)
        .find(Button({ ariaLabel: 'Fiscal year filter list' }))
        .click(),
      fiscalYearFilterSection
        .find(Button({ id: 'fiscalYearId-selection' }))
        .click(),
      fiscalYearFilterSection.find(SelectionOption(fiscalYear)).click(),
    ]);
  },

  selectButchGroupFilter: (batchGroup) => {
    cy.do([
      invoiceFiltersSection
        .find(batchGroupFilterSection)
        .find(Button({ ariaLabel: 'Batch group filter list' }))
        .click(),
      batchGroupFilterSection
        .find(Button({ id: 'batchGroupId-selection' }))
        .click(),
      batchGroupFilterSection.find(SelectionOption(batchGroup)).click(),
    ]);
  },
};