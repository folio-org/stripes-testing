import moment from 'moment';
import uuid from 'uuid';
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
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiSelect,
  MultiSelectOption,
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
import { INVOICE_STATUSES } from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';
import { randomFourDigitNumber } from '../../utils/stringTools';
import FinanceHelper from '../finance/financeHelper';
import InvoiceEditForm from './invoiceEditForm';
import InvoiceStates from './invoiceStates';
import SelectUser from './modal/selectUser';
import VoucherExportForm from './voucherExportForm';

const invoiceResultsHeaderPane = PaneHeader({ id: 'paneHeaderinvoice-results-pane' });
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
const invoiceCreatedByFilterSection = Section({ id: 'metadata.createdByUserId' });
const approvalDateFilterSection = Section({ id: 'approvalDate' });
const newBlankLineButton = Button('New blank line');
const polLookUpButton = Button('POL look-up');
const selectOrderLinesModal = Modal('Select order lines');
const fundInInvoiceSection = Section({ id: 'invoiceLineForm-fundDistribution' });
const searhInputId = 'input-record-search';
const invoiceDateField = TextField('Invoice date*');
const vendorInvoiceNumberField = TextField('Vendor invoice number*');
const batchGroupSelection = Selection('Batch group*');
const invoicePaymentMethodSelect = Select({ id: 'invoice-payment-method' });

const getDefaultInvoice = ({
  batchGroupId,
  batchGroupName,
  vendorId,
  vendorName,
  fiscalYearId,
  accountingCode,
  invoiceStatus = 'Open',
  invoiceDate = moment.utc().format(),
  exportToAccounting = true,
}) => ({
  chkSubscriptionOverlap: true,
  currency: 'USD',
  source: 'User',
  batchGroupId,
  batchGroupName,
  status: invoiceStatus,
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
  subTotal = 0,
  subscriptionInfo,
  subscriptionStart,
  subscriptionEnd,
  releaseEncumbrance,
}) => ({
  invoiceId,
  poLineId,
  invoiceLineStatus,
  description: `autotest inLine description ${randomFourDigitNumber()}`,
  fundDistributions,
  quantity: 1,
  subTotal,
  subscriptionInfo,
  subscriptionStart,
  subscriptionEnd,
  accountingCode,
  releaseEncumbrance,
  id: uuid(),
});

export default {
  getDefaultInvoice,
  getDefaultInvoiceLine,
  getInvoiceViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'invoice/invoices',
        searchParams,
      })
      .then(({ body }) => body);
  },
  createInvoiceViaApi({
    vendorId,
    accountingCode,
    fiscalYearId,
    batchGroupId,
    invoiceStatus,
    exportToAccounting,
  }) {
    const create = (invoice) => {
      cy.okapiRequest({
        method: 'POST',
        path: 'invoice/invoices',
        body: invoice,
      }).then(({ body }) => {
        cy.wrap(body).as('invoice');
      });
    };
    const invoice = getDefaultInvoice({
      fiscalYearId,
      batchGroupId,
      vendorId,
      accountingCode,
      invoiceStatus,
      exportToAccounting,
    });

    if (batchGroupId) {
      create(invoice);
    } else {
      cy.getBatchGroups().then(({ id }) => {
        create({ ...invoice, batchGroupId: id });
      });
    }

    return cy.get('@invoice');
  },
  updateInvoiceViaApi(invoiceProperties, searchParams = {}) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `invoice/invoices/${invoiceProperties.id}`,
      body: invoiceProperties,
      searchParams,
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
  changeInvoiceStatusViaApi({ invoice, status, searchParams = {} }) {
    const changeStatusViaApi = ({ vendorInvoiceNo, newStatus }) => {
      this.getInvoiceViaApi({ query: `vendorInvoiceNo="${vendorInvoiceNo}"` }).then(
        ({ invoices }) => {
          this.updateInvoiceViaApi({ ...invoices[0], status: newStatus }, searchParams);
        },
      );
    };

    const { vendorInvoiceNo } = invoice;
    if ([INVOICE_STATUSES.APPROVED, INVOICE_STATUSES.PAID].includes(status)) {
      return this.approveInvoiceViaApi({ invoice }).then(() => {
        if (status !== INVOICE_STATUSES.APPROVED) {
          changeStatusViaApi({ vendorInvoiceNo, newStatus: status });
        }
      });
    } else {
      return changeStatusViaApi({ vendorInvoiceNo, newStatus: status });
    }
  },

  createInvoiceLineViaApi(invoiceLineProperties) {
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
    batchGroupId,
    invoiceStatus,
    fundDistributions,
    accountingCode,
    subTotal,
    releaseEncumbrance,
    exportToAccounting,
  }) {
    this.createInvoiceViaApi({
      vendorId,
      accountingCode,
      fiscalYearId,
      batchGroupId,
      invoiceStatus,
      exportToAccounting,
    }).then((resp) => {
      cy.wrap(resp).as('invoice');
      const { id: invoiceId, status: invoiceLineStatus } = resp;
      const invoiceLine = getDefaultInvoiceLine({
        invoiceId,
        invoiceLineStatus,
        poLineId,
        fundDistributions,
        subTotal,
        accountingCode,
        releaseEncumbrance,
      });
      this.createInvoiceLineViaApi(invoiceLine);
    });
    return cy.get('@invoice');
  },

  createInvoiceWithInvoiceLineWithoutOrderViaApi({
    vendorId,
    fiscalYearId,
    batchGroupId,
    invoiceStatus,
    fundDistributions,
    accountingCode,
    subTotal,
    releaseEncumbrance,
    exportToAccounting,
  }) {
    this.createInvoiceViaApi({
      vendorId,
      accountingCode,
      fiscalYearId,
      batchGroupId,
      invoiceStatus,
      exportToAccounting,
    }).then((resp) => {
      cy.wrap(resp).as('invoice');
      const { id: invoiceId, status: invoiceLineStatus } = resp;
      const invoiceLine = getDefaultInvoiceLine({
        invoiceId,
        invoiceLineStatus,
        fundDistributions,
        subTotal,
        accountingCode,
        releaseEncumbrance,
      });
      this.createInvoiceLineViaApi(invoiceLine);
    });
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
    cy.do([fundInInvoiceSection.find(Button('%')).click()]);
    cy.wait(2000);
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
  },

  checkSearchResultsContent({ records = [] } = {}) {
    records.forEach((record, index) => {
      if (record.invoiceNumber) {
        cy.expect(
          invoiceResultsPane
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 0 }))
            .has({ content: including(record.invoiceNumber) }),
        );
      }
      if (record.status) {
        cy.expect(
          invoiceResultsPane
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 3 }))
            .has({ content: including(record.status) }),
        );
      }
      if (record.amount) {
        cy.expect(
          invoiceResultsPane
            .find(MultiColumnListRow({ rowIndexInParent: `row-${index}` }))
            .find(MultiColumnListCell({ columnIndex: 4 }))
            .has({ content: including(record.amount) }),
        );
      }
    });
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
      invoiceDateField.fillIn(invoice.invoiceDate),
      vendorInvoiceNumberField.fillIn(invoice.invoiceNumber),
    ]);
    this.selectVendorOnUi(invoice.vendorName);
    cy.do([
      batchGroupSelection.open(),
      SelectionList().select(invoice.batchGroup),
      invoicePaymentMethodSelect.choose('Cash'),
      Checkbox('Export to accounting').click(),
    ]);
    this.checkVendorPrimaryAddress(vendorPrimaryAddress);
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
  },

  createDefaultInvoiceWithoutAddress(invoice) {
    cy.wait(4000);
    cy.do(actionsButton.click());
    cy.expect(buttonNew.exists());
    cy.do([
      buttonNew.click(),
      Selection('Status*').open(),
      SelectionList().select(invoice.status),
      invoiceDateField.fillIn(invoice.invoiceDate),
      vendorInvoiceNumberField.fillIn(invoice.invoiceNumber),
    ]);
    cy.wait(2000);
    this.selectVendorOnUi(invoice.vendorName);
    cy.do([
      batchGroupSelection.open(),
      SelectionList().select(invoice.batchGroup),
      invoicePaymentMethodSelect.choose('Cash'),
      Checkbox('Export to accounting').click(),
    ]);
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
  },

  createInvoiceFromOrder(invoice, fiscalYear) {
    cy.wait(4000);
    cy.do(Button({ id: 'invoice-fiscal-year' }).click());
    cy.wait(4000);
    cy.do([
      SelectionOption(fiscalYear).click(),
      invoiceDateField.fillIn(invoice.invoiceDate),
      vendorInvoiceNumberField.fillIn(invoice.invoiceNumber),
      batchGroupSelection.open(),
      SelectionList().select(invoice.batchGroup),
      invoicePaymentMethodSelect.choose('EFT'),
    ]);
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
  },

  createInvoiceFromOrderWithMultiLines(invoice, fiscalYear) {
    cy.wait(4000);
    cy.do(Button({ id: 'invoice-fiscal-year' }).click());
    cy.wait(4000);
    cy.do([
      SelectionOption(fiscalYear).click(),
      invoiceDateField.fillIn(invoice.invoiceDate),
      vendorInvoiceNumberField.fillIn(invoice.invoiceNumber),
    ]);
    cy.do([
      batchGroupSelection.open(),
      SelectionList().select(invoice.batchGroup),
      invoicePaymentMethodSelect.choose('EFT'),
    ]);
    cy.wait(4000);
    cy.do(Button('Save & continue').click());
    cy.wait(4000);
    cy.do(saveAndClose.click());
    cy.wait(4000);
  },

  createInvoiceFromOrderWithoutFY(invoice) {
    cy.do([
      invoiceDateField.fillIn(invoice.invoiceDate),
      vendorInvoiceNumberField.fillIn(invoice.invoiceNumber),
    ]);
    cy.do([
      batchGroupSelection.open(),
      SelectionList().select(invoice.batchGroup),
      invoicePaymentMethodSelect.choose('EFT'),
    ]);
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
  },

  cancellcreatingInvoiceFromOrderWithoutFY(invoice) {
    cy.do([
      invoiceDateField.fillIn(invoice.invoiceDate),
      vendorInvoiceNumberField.fillIn(invoice.invoiceNumber),
      batchGroupSelection.open(),
      SelectionList().select(invoice.batchGroup),
      invoicePaymentMethodSelect.choose('EFT'),
      Button('Cancel').click(),
      Button({ id: 'clickable-cancel-editing-confirmation-cancel' }).click(),
    ]);
  },

  createRolloverInvoice(invoice, organization) {
    cy.do(actionsButton.click());
    cy.expect(buttonNew.exists());
    cy.do([
      buttonNew.click(),
      Selection('Status*').open(),
      SelectionList().select(invoice.status),
      invoiceDateField.fillIn(invoice.invoiceDate),
      vendorInvoiceNumberField.fillIn(invoice.invoiceNumber),
    ]);
    this.selectVendorOnUi(organization);
    cy.do([
      batchGroupSelection.open(),
      SelectionList().select('FOLIO'),
      invoicePaymentMethodSelect.choose('Cash'),
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
      invoiceDateField.fillIn(invoice.invoiceDate),
      vendorInvoiceNumberField.fillIn(invoice.invoiceNumber),
    ]);
    this.selectVendorOnUi(organization);
    cy.do([
      batchGroupSelection.open(),
      SelectionList().select('FOLIO'),
      invoicePaymentMethodSelect.choose('Cash'),
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
    cy.wait(3000);
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
      invoiceDateField.fillIn(invoice.invoiceDate),
      vendorInvoiceNumberField.fillIn(invoice.invoiceNumber),
    ]);
    this.selectVendorOnUi(organization);
    cy.do([
      batchGroupSelection.open(),
      SelectionList().select('FOLIO'),
      invoicePaymentMethodSelect.choose('Cash'),
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
      invoiceDateField.fillIn(invoice.invoiceDate),
      vendorInvoiceNumberField.fillIn(invoice.invoiceNumber),
    ]);
    this.selectVendorOnUi(invoice.vendorName);
    cy.do([
      Selection('Accounting code').open(),
      SelectionList().select(`Default (${invoice.accountingCode})`),
      batchGroupSelection.open(),
      SelectionList().select(invoice.batchGroup),
      invoicePaymentMethodSelect.choose('Cash'),
      Checkbox('Export to accounting').click(),
    ]);
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceCreatedMessage);
  },

  selectVendorOnUi: (organizationName) => {
    cy.do(Button('Organization look-up').click());
    cy.wait(2000);
    cy.expect(SearchField({ id: searchInputId }).exists());
    cy.expect(SearchField({ id: searchInputId }).has({ visible: true }));
    cy.do([SearchField({ id: searchInputId }).fillIn(organizationName), searchButton.click()]);
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
    cy.wait(3000);
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

  verifyStatus: (status) => {
    cy.get('#pane-invoiceLineDetails').should('contain', status);
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
    cy.wait(2000);
    cy.do(saveAndClose.click());
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
    cy.wait(4000);
    cy.do([
      Modal('Select order lines')
        .find(SearchField({ id: searchInputId }))
        .fillIn(orderNumber),
      Modal('Select order lines').find(searchButton).click(),
    ]);
    cy.wait(4000);
    cy.do([
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
            content: `${currency}${invoiceLine.subTotal}.00`,
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
    ]);
    cy.wait(2000);
    cy.do([saveAndClose.click()]);
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
    cy.wait(8000);
  },

  changeFundInLine: (fund) => {
    cy.do([
      Selection('Fund ID*').open(),
      SelectionList().select(fund.name.concat(' ', '(', fund.code, ')')),
      saveAndClose.click(),
    ]);
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
  },

  changeFundInfoInLineWithoutSave: (index, value, type) => {
    cy.do([
      TextField({ name: `fundDistributions[${index}].value` }).fillIn(value),
      Section({ id: 'invoiceLineForm-fundDistribution' }).find(Button(type)).click(),
    ]);
  },

  addFundToLine: (fund) => {
    cy.do([
      Button({ id: 'fundDistributions-add-button' }).click(),
      Selection('Fund ID*').open(),
      SelectionList().select(fund.name.concat(' ', '(', fund.code, ')')),
    ]);
    cy.wait(2000);
    cy.do(saveAndClose.click());
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceLineCreatedMessage);
  },

  addFundToLineWithoutSaveInPercentage: (index, fund, value) => {
    cy.do([
      Button({ id: 'fundDistributions-add-button' }).click(),
      Button({ id: `fundDistributions[${index}].fundId` }).click(),
      SelectionList().select(fund.name.concat(' ', '(', fund.code, ')')),
      TextField({ name: `fundDistributions[${index}].value` }).fillIn(value),
    ]);
    cy.wait(4000);
    cy.do(TextField({ name: `fundDistributions[${index}].value` }).fillIn(value));
  },

  saveLine: () => {
    cy.do(saveAndClose.click());
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

  deleteFundInInvoiceLineWithoutSave: () => {
    cy.do([
      Section({ id: 'invoiceLineForm-fundDistribution' })
        .find(Button({ icon: 'trash' }))
        .click(),
    ]);
  },

  approveInvoice: () => {
    cy.do([
      invoiceDetailsPaneHeader.find(actionsButton).click(),
      Button('Approve').click(),
      submitButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage(InvoiceStates.invoiceApprovedMessage);
  },

  canNotApproveInvoice: (errorMessage) => {
    cy.do([
      invoiceDetailsPaneHeader.find(actionsButton).click(),
      Button('Approve').click(),
      submitButton.click(),
    ]);
    InteractorsTools.checkCalloutErrorMessage(errorMessage);
  },

  canNotApproveAndPayInvoice: (errorMessage) => {
    cy.do([
      invoiceDetailsPaneHeader.find(actionsButton).click(),
      Button('Approve & pay').click(),
      submitButton.click(),
    ]);
    InteractorsTools.checkCalloutErrorMessage(errorMessage);
  },

  approveAndPayInvoice: () => {
    cy.do([
      invoiceDetailsPaneHeader.find(actionsButton).click(),
      Button('Approve & pay').click(),
      submitButton.click(),
    ]);
  },

  sortInvoicesBy: (column) => {
    cy.do(MultiColumnListHeader(column).click());
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
    cy.do(invoiceDetailsPaneHeader.find(actionsButton).click());
    cy.wait(500);
    cy.do(Button('Edit').click());
    cy.wait(1000);
    cy.get('label[id=sl-label-currency]').scrollIntoView();
    cy.do(Selection('Currency*').open());
    cy.wait(500);
    cy.do(SelectionList().select(currency));
    cy.wait(500);
    cy.do(saveAndClose.click());
    cy.wait(500);
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
  expandInvoiceResultsActions() {
    cy.do(invoiceResultsHeaderPane.find(actionsButton).click());
  },
  checkActionPresentInList({ actionName, present = true }) {
    if (present) {
      cy.expect(Button(actionName).exists());
    } else {
      cy.expect(Button(actionName).absent());
    }
  },
  openExportVoucherForm() {
    cy.do([invoiceResultsHeaderPane.find(actionsButton).click(), Button('Voucher export').click()]);

    VoucherExportForm.waitLoading();

    return VoucherExportForm;
  },
  voucherExport(batchGroup) {
    this.openExportVoucherForm();

    VoucherExportForm.selectBatchGroup({ batchGroup });
    VoucherExportForm.clickRunManualExportButton();
    VoucherExportForm.downloadVoucher();
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
      .set('Donor (Deprecated)', orderLine.donor)
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

  selectInvoiceLineByNumber(total) {
    cy.contains(total).click();
  },

  checkFundInInvoiceLine: (fund) => {
    cy.wait(4000);
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

  selectInvoiceByNumber(invoiceNumber) {
    this.searchByNumber(invoiceNumber);
    this.selectInvoice(invoiceNumber);
  },
  selectInvoice: (invoiceNumber) => {
    cy.wait(4000);
    cy.do(invoiceResultsPane.find(Link(invoiceNumber)).click());
    cy.wait(4000);
  },

  selectInvoiceByIndex: (invoiceNumber, indexNumber) => {
    cy.wait(4000);
    cy.do(
      invoiceResultsPane
        .find(MultiColumnListRow({ index: indexNumber }))
        .find(Link(invoiceNumber))
        .click(),
    );
  },

  checkVendorCodeInInvoicePane: (vendorCode) => {
    cy.wait(4000);
    cy.expect(Pane({ subtitle: vendorCode }).exists());
  },

  closeInvoiceDetailsPane: () => {
    cy.do(invoiceDetailsPane.find(Button({ icon: 'times' })).click());
    cy.wait(2000);
  },

  closeInvoiceLineDetailsPane: () => {
    cy.do(invoiceLineDetailsPane.find(Button({ icon: 'times' })).click());
    cy.wait(2000);
  },

  backToInvoiceDetailsView: () => {
    cy.do(invoiceLineDetailsPane.find(Button({ icon: 'arrow-left' })).click());
    cy.wait(2000);
  },

  resetFilters: () => {
    cy.wait(1500);
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

  cancelEditInvoice: () => {
    cy.wait(4000);
    cy.do(Button('Cancel').click());
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

  addAdjustmentToInvoiceLine: (
    descriptionInput,
    valueInput,
    percentOrDollar,
    realtioToTotal,
    exportToAccounting = false,
  ) => {
    cy.do([
      Button({ id: 'adjustments-add-button' }).click(),
      TextField({ name: 'adjustments[0].description' }).fillIn(descriptionInput),
      TextField({ name: 'adjustments[0].value' }).fillIn(valueInput),
    ]);
    if (percentOrDollar === '$') {
      cy.do(Section({ id: 'invoiceLineForm-adjustments' }).find(Button('$')).click());
    } else if (percentOrDollar === '%') {
      cy.do(Section({ id: 'invoiceLineForm-adjustments' }).find(Button('%')).click());
    }
    cy.do([Select({ name: 'adjustments[0].relationToTotal' }).choose(realtioToTotal)]);
    if (exportToAccounting === true) {
      cy.do(Checkbox({ name: 'adjustments[0].exportToAccounting' }).click());
    }
    cy.do(saveAndClose.click());
  },

  selectStatusFilter: (status) => {
    cy.wait(500);
    cy.do([
      invoiceFiltersSection
        .find(Section({ id: 'status' }))
        .find(Button({ ariaLabel: 'Status filter list' }))
        .click(),
      cy.wait(1000),
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
    cy.do(
      Modal('Select Organization')
        .find(MultiColumnListRow({ index: 0 }))
        .click(),
    );
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
      fundCodeFilterSection
        .find(Button({ ariaControls: 'multiselect-option-list-fund-filter' }))
        .click(),
    ]);
    cy.wait(4000);
    cy.do(fundCodeFilterSection.find(MultiSelect({ id: 'fund-filter' })).fillIn(fundCode));
    cy.do(MultiSelectOption(fundCode).click());
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

  selectCreatedByFilter: (userName) => {
    cy.do([
      invoiceFiltersSection
        .find(invoiceCreatedByFilterSection)
        .find(Button({ ariaLabel: 'Created by filter list' }))
        .click(),
      Button({ id: 'metadata.createdByUserId-button' }).click(),
    ]);
    SelectUser.selectUser(userName);
  },

  openPageCurrentEncumbrance: (title) => {
    cy.get('#invoiceLineFundDistribution')
      .find('a')
      .contains(title)
      .invoke('removeAttr', 'target')
      .click();
  },

  verifyCurrentEncumbrance: (expectedValue) => {
    cy.get('#invoiceLineFundDistribution')
      .find('div[role="gridcell"]')
      .filter(':nth-child(6)')
      .each(($el) => {
        const text = $el.text().trim();
        expect(text).to.eq(expectedValue);
      });
  },

  openPOLFromInvoiceLineInCurrentPage: (polNumber) => {
    cy.get('#invoiceLineInformation')
      .find('a')
      .contains(polNumber)
      .invoke('removeAttr', 'target')
      .click();
  },

  checkApproveButtonIsDissabled: () => {
    cy.wait(6000);
    cy.do(PaneHeader({ id: 'paneHeaderpane-invoiceDetails' }).find(actionsButton).click());
    cy.expect(Button('Approve').is({ disabled: true }));
  },

  checkPayButtonIsDissabled: () => {
    cy.wait(6000);
    cy.do(PaneHeader({ id: 'paneHeaderpane-invoiceDetails' }).find(actionsButton).click());
    cy.expect(Button('Pay').is({ disabled: true }));
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

  openPageFundInInvoiceLine: (title) => {
    cy.get('#invoiceLineFundDistribution')
      .find('a')
      .contains(title)
      .invoke('removeAttr', 'target')
      .click();
  },

  checkAbsentFYOptionInInvoice: (fiscalYear) => {
    cy.do(Selection('Fiscal year*').open());
    cy.get('div[class*=selectionListRoot-]').then(($element) => {
      const text = $element.text();
      expect(text).to.not.include(`${fiscalYear}`);
    });
  },

  differentCurrencyConfirmation: () => {
    cy.do(
      Modal({ id: 'invoice-line-currency-confirmation' })
        .find(Button({ id: 'clickable-invoice-line-currency-confirmation-confirm' }))
        .click(),
    );
    cy.wait(4000);
  },

  verifySearchResult(invoiceNumber) {
    cy.expect(
      invoiceResultsPane
        .find(MultiColumnListRow({ rowIndexInParent: 'row-0' }))
        .find(MultiColumnListCell({ columnIndex: 0 }))
        .has({ content: including(invoiceNumber) }),
    );
    cy.get('#invoice-results-pane')
      .find('div[class^="mclRowContainer--"]')
      .its('length')
      .then((rowCount) => {
        expect(rowCount).to.eq(1);
      });
  },

  clickNewInvoiceButton() {
    cy.do([Button('Actions').click(), Button('New').click()]);
  },

  checkPresetAdjustment(adjustment) {
    cy.get('input[name$=".description"]').then((inputs) => {
      const values = Array.from(inputs).map((input) => input.value);
      const index = values.indexOf(adjustment.description);
      cy.wrap(index).as('adjIndex');
      cy.expect([
        TextField({ name: `adjustments[${index}].description` }).has({
          value: adjustment.description,
        }),
        TextField({ name: `adjustments[${index}].value` }).has({ value: adjustment.value }),
        Select({ name: `adjustments[${index}].prorate` }).has({ value: adjustment.prorate }),
        Select({ name: `adjustments[${index}].relationToTotal` }).has({
          value: adjustment.relationToTotal,
        }),
        Checkbox({ name: `adjustments[${index}].exportToAccounting` }).has({ checked: false }),
      ]);
    });
    cy.get('@adjIndex').then((index) => {
      cy.get(`input[name="adjustments[${index}].description"]`)
        .parents()
        .eq(5)
        .within(() => {
          cy.get('button[data-test-adjustments-type-amount="true"]')
            .filter(':contains("$")')
            .should('have.class', 'primary---xHTjI');
        });
    });
  },

  deleteAdjustment() {
    cy.get('@adjIndex').then((index) => {
      cy.get(`input[name="adjustments[${index}].description"]`)
        .parents()
        .eq(5)
        .find('button[icon="trash"]')
        .click();
    });
  },

  checkAdjustmentAbsent(adjustment) {
    cy.expect(
      TextField({ name: including('description'), value: adjustment.description }).absent(),
    );
  },

  selectAdjustmentInDropdown(adjustmentDescription) {
    cy.expect(Selection('Preset adjustment').exists());
    cy.do([
      Selection('Preset adjustment').focus(),
      Selection('Preset adjustment').open(),
      SelectionList().select(adjustmentDescription),
    ]);
  },

  clickAddAdjustmentButton() {
    cy.wait(2000);
    cy.do(Button({ id: 'adjustments-add-button' }).click());
  },

  createInvoiceLineNewBlankLine() {
    cy.do([
      Accordion({ id: invoiceLinesAccordionId }).find(actionsButton).click(),
      newBlankLineButton.click(),
    ]);
  },
};
