import uuid from 'uuid';
import moment from 'moment';
import {
  Accordion,
  Button,
  Checkbox,
  HTML,
  including,
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
  TextField,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import { randomFourDigitNumber } from '../../utils/stringTools';
import FinanceHelper from '../finance/financeHelper';
import InvoiceEditForm from './invoiceEditForm';
import { INVOICE_STATUSES } from '../../constants';
import InvoiceStates from './invoiceStates';

const invoiceResultsPane = Pane({ id: 'invoice-results-pane' });
const invoiceDetailsPane = Pane({ id: 'pane-invoiceDetails' });
const invoiceDetailsPaneHeader = PaneHeader({ id: 'paneHeaderpane-invoiceDetails' });
const informationSection = invoiceDetailsPane.find(Section({ id: 'information' }));

const buttonNew = Button('New');
const saveAndClose = Button('Save & close');

const vendorDetailsAccordionId = 'vendorDetails';
const invoiceLinesAccordionId = 'invoiceLines';
const actionsButton = Button('Actions');
const submitButton = Button('Submit');
const searchButton = Button('Search');
const searchInputId = 'input-record-search';
const numberOfSearchResultsHeader = '//*[@id="paneHeaderinvoice-results-pane-subtitle"]/span';
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
const newBlankLineButton = Button('New blank line');
const polLookUpButton = Button('POL look-up');
const selectOrderLinesModal = Modal('Select order lines');
const fundInInvoiceSection = Section({ id: 'invoiceLineForm-fundDistribution' });
const searhInputId = 'input-record-search';

const getDefaultInvoice = ({
  batchGroupId,
  batchGroupName,
  vendorId,
  vendorName,
  fiscalYearId,
  accountingCode,
  invoiceDate = moment.utc().format(),
  exportToAccounting = true,
}) => ({
  chkSubscriptionOverlap: true,
  currency: 'USD',
  source: 'User',
  batchGroupId,
  batchGroupName,
  status: 'Open',
  exportToAccounting,
  vendorId,
  vendorName,
  fiscalYearId,
  invoiceDate,
  vendorInvoiceNo: FinanceHelper.getRandomInvoiceNumber(),
  accountingCode,
  paymentMethod: 'Cash',
  id: uuid(),
});

const getDefaultInvoiceLine = ({
  invoiceId,
  invoiceLineStatus,
  poLineId,
  fundDistributions,
  accountingCode,
  releaseEncumbrance,
}) => ({
  invoiceId,
  poLineId,
  invoiceLineStatus,
  description: `autotest inLine description ${randomFourDigitNumber()}`,
  fundDistributions,
  quantity: 1,
  subTotal: 0,
  accountingCode,
  releaseEncumbrance,
  id: uuid(),
});

export default {
  getDefaultInvoice,
  getInvoiceViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'invoice/invoices',
        searchParams,
      })
      .then(({ body }) => body);
  },
  createInvoiceViaApi({ vendorId, accountingCode, fiscalYearId, exportToAccounting }) {
    cy.getBatchGroups().then(({ id: batchGroupId }) => {
      const invoice = getDefaultInvoice({
        fiscalYearId,
        batchGroupId,
        vendorId,
        accountingCode,
        exportToAccounting,
      });
      cy.okapiRequest({
        method: 'POST',
        path: 'invoice/invoices',
        body: invoice,
      }).then(({ body }) => {
        cy.wrap(body).as('invoice');
      });
    });
    return cy.get('@invoice');
  },
  updateInvoiceViaApi(invoiceProperties) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `invoice/invoices/${invoiceProperties.id}`,
      body: invoiceProperties,
    });
  },
  deleteInvoiceViaApi(invoiceId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `invoice/invoices/${invoiceId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
  approveInvoiceViaApi({ invoice }) {
    return this.getInvoiceViaApi({ query: `vendorInvoiceNo="${invoice.vendorInvoiceNo}"` }).then(
      ({ invoices }) => {
        this.updateInvoiceViaApi({ ...invoices[0], status: 'Approved' });
      },
    );
  },
  changeInvoiceStatusViaApi({ invoice, status }) {
    return this.approveInvoiceViaApi({ invoice }).then(() => {
      if (status !== INVOICE_STATUSES.APPROVED) {
        this.getInvoiceViaApi({ query: `vendorInvoiceNo="${invoice.vendorInvoiceNo}"` }).then(
          ({ invoices }) => {
            this.updateInvoiceViaApi({ ...invoices[0], status });
          },
        );
      }
    });
  },
  createInviceLineViaApi(invoiceLineProperties) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'invoice/invoice-lines',
        body: invoiceLineProperties,
      })
      .then(({ body }) => body);
  },
  createInvoiceWithInvoiceLineViaApi({
    vendorId,
    poLineId,
    fiscalYearId,
    fundDistributions,
    accountingCode,
    releaseEncumbrance,
    exportToAccounting,
  }) {
    this.createInvoiceViaApi({ vendorId, accountingCode, fiscalYearId, exportToAccounting }).then(
      (resp) => {
        cy.wrap(resp).as('invoice');
        const { id: invoiceId, status: invoiceLineStatus } = resp;
        const invoiceLine = getDefaultInvoiceLine({
          invoiceId,
          invoiceLineStatus,
          poLineId,
          fundDistributions,
          accountingCode,
          releaseEncumbrance,
        });
        this.createInviceLineViaApi(invoiceLine);
      },
    );
    return cy.get('@invoice');
  },
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

  createInvoiceLinePOLLookUWithSubTotal: (orderNumber, total) => {
    cy.do([
      Accordion({ id: invoiceLinesAccordionId }).find(actionsButton).click(),
      newBlankLineButton.click(),
    ]);
    cy.do([
      polLookUpButton.click(),
      selectOrderLinesModal.find(SearchField({ id: searhInputId })).fillIn(orderNumber),
      searchButton.click(),
    ]);
    FinanceHelper.selectFromResultsList();
    cy.get('input[name="subTotal"]').clear().type(total);
    cy.do([fundInInvoiceSection.find(Button('%')).click(), saveAndClose.click()]);
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
    cy.wait(4000);
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
      Checkbox('Export to accounting').click(),
    ]);
    this.checkVendorPrimaryAddress(vendorPrimaryAddress);
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
  },

  createInvoiceFromOrder(invoice, fiscalYear) {
    cy.wait(4000);
    cy.do(Button({ id: 'invoice-fiscal-year' }).click());
    cy.wait(4000);
    cy.do([
      SelectionOption(fiscalYear).click(),
      TextField('Invoice date*').fillIn(invoice.invoiceDate),
      TextField('Vendor invoice number*').fillIn(invoice.invoiceNumber),
    ]);
    cy.do([
      Selection('Batch group*').open(),
      SelectionList().select(invoice.batchGroup),
      Select({ id: 'invoice-payment-method' }).choose('EFT'),
    ]);
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
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
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
  },

  createRolloverInvoiceWithAjustmentAndFund(
    invoice,
    organization,
    descriptionInput,
    valueInput,
    percentOrDollar,
    proRate,
    realtioToTotal,
    exportToAccounting = false,
    fund,
  ) {
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
    cy.do([
      Button({ id: 'adjustments-add-button' }).click(),
      TextField({ name: 'adjustments[0].description' }).fillIn(descriptionInput),
      TextField({ name: 'adjustments[0].value' }).fillIn(valueInput),
    ]);
    if (percentOrDollar === '$') {
      cy.do(Button('$').click());
    } else if (percentOrDollar === '%') {
      cy.do(Button('%').click());
    }
    cy.do([
      Select({ name: 'adjustments[0].prorate' }).choose(proRate),
      Select({ name: 'adjustments[0].relationToTotal' }).choose(realtioToTotal),
    ]);
    if (exportToAccounting === true) {
      cy.do(Checkbox({ name: 'adjustments[0].exportToAccounting' }).click());
    }
    cy.do([
      Button({ id: 'adjustments[0].fundDistributions-add-button' }).click(),
      Button({ id: 'adjustments[0].fundDistributions[0].fundId' }).click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
    ]);
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
  },

  createRolloverInvoiceWithFY(invoice, organization, fiscalYear) {
    cy.do(actionsButton.click());
    cy.expect(buttonNew.exists());
    cy.do([
      buttonNew.click(),
      Selection('Status*').open(),
      SelectionList().select(invoice.status),
      Selection('Fiscal year').open(),
      SelectionList().select(fiscalYear.code),
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
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
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
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
  },

  selectVendorOnUi: (organizationName) => {
    cy.do([
      Button('Organization look-up').click(),
      SearchField({ id: searchInputId }).fillIn(organizationName),
      searchButton.click(),
    ]);
    FinanceHelper.selectFromResultsList();
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
    cy.expect(invoiceDetailsPane.exists());

    if (vendorPrimaryAddress) {
      this.checkVendorPrimaryAddress(vendorPrimaryAddress);
    }

    if (invoice.information) {
      cy.expect([
        informationSection
          .find(KeyValue('Fiscal year'))
          .has({ value: including(invoice.information.fiscalYear) }),
        informationSection
          .find(KeyValue('Status'))
          .has({ value: including(invoice.information.status) }),
      ]);
    }

    cy.expect([
      Accordion({ id: vendorDetailsAccordionId })
        .find(KeyValue({ value: invoice.invoiceNumber }))
        .exists(),
      Accordion({ id: vendorDetailsAccordionId })
        .find(KeyValue('Vendor name'))
        .has({ value: invoice.vendorName }),
      Accordion({ id: vendorDetailsAccordionId })
        .find(KeyValue('Accounting code'))
        .has({ value: invoice.accountingCode }),
    ]);
  },

  deleteInvoiceViaActions() {
    cy.do([invoiceDetailsPaneHeader.find(actionsButton).click(), deleteButton.click()]);
  },

  deleteInvoiceLineViaActions() {
    cy.do([
      invoiceLineDetailsPane.find(actionsButton).click(),
      deleteButton.click(),
      Modal({ id: 'delete-invoice-line-confirmation' }).find(deleteButton).click(),
    ]);
  },

  confirmInvoiceDeletion: () => {
    cy.do(
      Button('Delete', {
        id: 'clickable-delete-invoice-confirmation-confirm',
      }).click(),
    );
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceDeletedMessage);
  },

  createInvoiceLine: (invoiceLine) => {
    cy.do(Accordion({ id: invoiceLinesAccordionId }).find(actionsButton).click());
    cy.do(newBlankLineButton.click());
    // TODO: update using interactors once we will be able to pass negative value into text field
    cy.xpath('//*[@id="subTotal"]').type(invoiceLine.subTotal);
    cy.do([
      // TextField({ name: 'subTotal' }).fillIn(invoiceLine.subTotal),
      TextField('Description*').fillIn(invoiceLine.description),
      TextField('Quantity*').fillIn(invoiceLine.quantity.toString()),
      saveAndClose.click(),
    ]);
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
  },

  createInvoiceLineWithFund: (invoiceLine, fund) => {
    cy.do(Accordion({ id: invoiceLinesAccordionId }).find(actionsButton).click());
    cy.do(newBlankLineButton.click());
    cy.do([
      TextField({ name: 'subTotal' }).fillIn(invoiceLine.subTotal),
      TextField('Description*').fillIn(invoiceLine.description),
      TextField('Quantity*').fillIn(invoiceLine.quantity.toString()),
      Button({ id: 'fundDistributions-add-button' }).click(),
      Button({ name: 'fundDistributions[0].fundId' }).click(),
      SelectionOption(`${fund.name} (${fund.code})`).click(),
      saveAndClose.click(),
    ]);
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
  },

  createInvoiceLinePOLLookUp: (orderNumber) => {
    cy.do(Accordion({ id: invoiceLinesAccordionId }).find(actionsButton).click());
    cy.do(newBlankLineButton.click());
    cy.do([
      Button('POL look-up').click(),
      Modal('Select order lines')
        .find(SearchField({ id: searchInputId }))
        .fillIn(orderNumber),
      searchButton.click(),
    ]);
    FinanceHelper.selectFromResultsList();
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
  },

  createInvoiceLineFromPol(orderNumber, rowNumber = 0) {
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
    cy.wait(4000);
  },

  checkInvoiceLine: (invoiceLine, currency = '$') => {
    cy.expect(Accordion({ id: invoiceLinesAccordionId }).exists());
    cy.expect(
      Accordion({ id: invoiceLinesAccordionId })
        .find(MultiColumnListCell({ content: invoiceLine.description }))
        .exists(),
    );
    cy.expect(
      Accordion({ id: invoiceLinesAccordionId })
        .find(MultiColumnListCell({ content: invoiceLine.quantity.toString() }))
        .exists(),
    );
    cy.expect(
      Accordion({ id: invoiceLinesAccordionId })
        .find(
          MultiColumnListCell({
            content: `$${invoiceLine.subTotal}.00`,
          }),
        )
        .exists(),
    );
  },

  openInvoiceEditForm({ createNew = false } = {}) {
    if (createNew) {
      cy.do([invoiceResultsPane.find(actionsButton).click(), Button('New').click()]);
    } else {
      cy.do([invoiceDetailsPaneHeader.find(actionsButton).click(), Button('Edit').click()]);
    }
    InvoiceEditForm.waitLoading();

    return InvoiceEditForm;
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
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
  },

  changeFundInLine: (fund) => {
    cy.do([
      Selection('Fund ID*').open(),
      SelectionList().select(fund.name.concat(' ', '(', fund.code, ')')),
      saveAndClose.click(),
    ]);
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
  },

  addFundToLine: (fund) => {
    cy.do([
      Button({ id: 'fundDistributions-add-button' }).click(),
      Selection('Fund ID*').open(),
      SelectionList().select(fund.name.concat(' ', '(', fund.code, ')')),
      saveAndClose.click(),
    ]);
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
  },

  deleteFundInInvoiceLine: () => {
    cy.do([
      Section({ id: 'invoiceLineForm-fundDistribution' })
        .find(Button({ icon: 'trash' }))
        .click(),
      saveAndClose.click(),
    ]);
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
  },

  approveInvoice: () => {
    cy.do([
      invoiceDetailsPaneHeader.find(actionsButton).click(),
      Button('Approve').click(),
      submitButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceApprovedMessage);
  },

  searchByNumber: (invoiceNumber) => {
    cy.do([
      SearchField({ id: searchInputId }).selectIndex('Vendor invoice number'),
      SearchField({ id: searchInputId }).fillIn(invoiceNumber),
      searchButton.click(),
    ]);
  },

  searchByParameter(parameter, value) {
    cy.do([searchForm.selectIndex(parameter), searchForm.fillIn(value), Button('Search').click()]);
  },

  payInvoice: () => {
    cy.do([
      invoiceDetailsPaneHeader.find(actionsButton).click(),
      Button('Pay').click(),
      submitButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoicePaidMessage);
  },

  updateCurrency: (currency) => {
    cy.do([
      invoiceDetailsPaneHeader.find(actionsButton).click(),
      Button('Edit').click(),
      Selection('Currency*').open(),
      SelectionList().select(currency),
      saveAndClose.click(),
    ]);
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
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
            .exists(),
        );
        break;
      case 'EUR':
        cy.expect(
          Accordion({ id: 'extendedInformation' })
            .find(KeyValue({ value: 'Euro' }))
            .exists(),
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
          .has({ content: titleOrPackage }),
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
    cy.wait(6000);
    cy.do([
      PaneHeader({ id: 'paneHeaderinvoice-results-pane' }).find(actionsButton).click(),
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
        .click(),
    );
  },

  voucherExportManualExport: (batchGroup) => {
    cy.do([
      PaneHeader({ id: 'paneHeaderinvoice-results-pane' }).find(actionsButton).click(),
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
    cy.expect(
      MultiColumnList({ id: 'batch-voucher-exports' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .find(Button({ icon: 'download' }))
        .exists(),
    );
    cy.do(
      MultiColumnList({ id: 'batch-voucher-exports' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 3 }))
        .find(Button({ icon: 'download' }))
        .click(),
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
      .set('Vendor reference number', orderLine.vendorDetail.referenceNumbers[0].refNumber)
      .set('Donor', orderLine.donor)
      .set('Selector', orderLine.selector)
      .set('Volumes', orderLine.physical.volumes[0])
      .set('Product ID', orderLine.details.productIds[0].productId)
      .set('Product ID ISBN', orderLine.details.productIds[0].productId);
    return searchParamsMap;
  },

  waitLoading: () => {
    cy.expect(invoiceResultsPane.exists());
  },

  selectInvoiceLine: () => {
    cy.do(
      Section({ id: 'invoiceLines' })
        .find(MultiColumnListRow({ index: 0 }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .click(),
    );
  },

  checkFundInInvoiceLine: (fund) => {
    cy.expect(
      Section({ id: 'invoiceLineFundDistribution' })
        .find(Link(`${fund.name}(${fund.code})`))
        .exists(),
    );
  },

  checkFundListIsEmpty: () => {
    cy.expect(
      Section({ id: 'invoiceLineFundDistribution' })
        .find(HTML(including('The list contains no items')))
        .exists(),
    );
  },

  cancelInvoice: () => {
    cy.do([
      invoiceDetailsPaneHeader.find(actionsButton).click(),
      Button('Cancel').click(),
      submitButton.click(),
    ]);
  },

  selectInvoice: (invoiceNumber) => {
    cy.wait(4000);
    cy.do(invoiceResultsPane.find(Link(invoiceNumber)).click());
  },

  closeInvoiceDetailsPane: () => {
    cy.do(invoiceDetailsPane.find(Button({ icon: 'times' })).click());
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

  editInvoice: () => {
    cy.wait(4000);
    cy.do([
      PaneHeader({ id: 'paneHeaderpane-invoiceDetails' }).find(actionsButton).click(),
      Button('Edit').click(),
    ]);
  },

  changeFY: (fiscalYear) => {
    cy.wait(6000);
    cy.do([
      Selection('Fiscal year*').open(),
      SelectionList().select(fiscalYear),
      saveAndClose.click(),
    ]);
  },

  addAdjustment: (descriptionInput, valueInput, typeToggle, realtioToTotal) => {
    cy.do([
      Button({ id: 'adjustments-add-button' }).click(),
      TextField({ name: 'adjustments[0].description' }).fillIn(descriptionInput),
      TextField({ name: 'adjustments[0].value' }).fillIn(valueInput),
      Section({ id: 'invoiceLineForm-adjustments' }).find(Button(typeToggle)).click(),
      Select({ name: 'adjustments[0].relationToTotal' }).choose(realtioToTotal),
      saveAndClose.click(),
    ]);
  },

  addAdjustmentToInvoice: (
    descriptionInput,
    valueInput,
    percentOrDollar,
    proRate,
    realtioToTotal,
    exportToAccounting = false,
  ) => {
    cy.do([
      Button({ id: 'adjustments-add-button' }).click(),
      TextField({ name: 'adjustments[0].description' }).fillIn(descriptionInput),
      TextField({ name: 'adjustments[0].value' }).fillIn(valueInput),
    ]);
    if (percentOrDollar === '$') {
      cy.do(Button('$').click());
    } else if (percentOrDollar === '%') {
      cy.do(Button('%').click());
    }
    cy.do([
      Select({ name: 'adjustments[0].prorate' }).choose(proRate),
      Select({ name: 'adjustments[0].relationToTotal' }).choose(realtioToTotal),
    ]);
    if (exportToAccounting === true) {
      cy.do(Checkbox({ name: 'adjustments[0].exportToAccounting' }).click());
    }
    cy.do(saveAndClose.click());
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
    FinanceHelper.selectFromResultsList();
  },

  selectApprovalDateFilter: (dateFrom, dateTo) => {
    cy.do([
      invoiceFiltersSection
        .find(approvalDateFilterSection)
        .find(Button({ ariaLabel: 'Approval date filter list' }))
        .click(),
      approvalDateFilterSection.find(TextField({ name: 'startDate' })).fillIn(dateFrom),
      approvalDateFilterSection.find(TextField({ name: 'endDate' })).fillIn(dateTo),
      approvalDateFilterSection.find(Button('Apply')).click(),
    ]);
  },

  selectInvoiceDateFilter: (dateFrom, dateTo) => {
    cy.do([
      invoiceFiltersSection
        .find(invoiceDateFilterSection)
        .find(Button({ ariaLabel: 'Invoice date filter list' }))
        .click(),
      invoiceDateFilterSection.find(TextField({ name: 'startDate' })).fillIn(dateFrom),
      invoiceDateFilterSection.find(TextField({ name: 'endDate' })).fillIn(dateTo),
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
      fiscalYearFilterSection.find(Button({ id: 'fiscalYearId-selection' })).click(),
      fiscalYearFilterSection.find(SelectionOption(fiscalYear)).click(),
    ]);
  },

  selectButchGroupFilter: (batchGroup) => {
    cy.do([
      invoiceFiltersSection
        .find(batchGroupFilterSection)
        .find(Button({ ariaLabel: 'Batch group filter list' }))
        .click(),
      batchGroupFilterSection.find(Button({ id: 'batchGroupId-selection' })).click(),
      batchGroupFilterSection.find(SelectionOption(batchGroup)).click(),
    ]);
  },

  openPageCurrentEncumbrance: (title) => {
    cy.get('#invoiceLineFundDistribution')
      .find('*[class^="mclCell"]')
      .contains(title)
      .invoke('removeAttr', 'target')
      .click();
  },

  checkApproveButtonIsDissabled: () => {
    cy.wait(6000);
    cy.do(PaneHeader({ id: 'paneHeaderpane-invoiceDetails' }).find(actionsButton).click());
    cy.expect(Button('Approve').is({ disabled: true }));
  },

  clickOnOrganizationFromInvoice: (organizationName) => {
    cy.do(Section({ id: 'vendorDetails' }).find(Link(organizationName)).click());
  },

  selectFundInInvoiceLine: (fund) => {
    cy.do(
      Section({ id: 'invoiceLineFundDistribution' })
        .find(Link(`${fund.name}(${fund.code})`))
        .click(),
    );
  },
};
