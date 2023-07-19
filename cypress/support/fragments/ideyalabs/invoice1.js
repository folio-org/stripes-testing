import {
  Button,
  Pane,
  PaneContent,
  PaneHeader,
  Section,
  Select,
  SelectionOption,
  TextField,
  MultiColumnListRow,
  FieldSet,
  SearchField,
  MultiColumnList,
  Checkbox,
  MultiColumnListCell,
  Link
} from '../../../../interactors';
import interactorsTools from '../../utils/interactorsTools';

const invoiceStates = {
  invoiceCreatedMessage: 'Invoice has been saved',
  invoiceLineCreatedMessage: 'Invoice line has been saved',
  InvoiceApprovedMessage: 'Invoice has been approved successfully',
  InvoicePaidMessage: 'Invoice has been paid successfully',
  InvoiceDeletedMessage: 'Invoice has been deleted',
};

const actionsButton = Button('Actions');
const invoiceLinePane = Section({ id: 'pane-invoiceLineDetails' });
const invoiceLineDetailsPane = PaneHeader({
  id: 'paneHeaderpane-invoiceLineDetails',
});
const searhInputId = 'input-record-search';
const invoiceDetailsPaneId = 'paneHeaderpane-invoiceDetails';
const invoiceLineAdjustments = Select({ name: 'adjustments[0].prorate' });
const newButton = Button('New');
const orderType = Select('Order type*');
const saveAndClose = Button('Save & close');
const orderDetails = PaneHeader({ id: 'paneHeaderorder-details' });
const addPOLine = Button('Add PO line');
const title = TextField({ name: 'titleOrPackage' });
const fundDistributions = Button({ id: 'fundDistribution-add-button' });
const fund = FieldSet({ id: 'fundDistributions' });
const fundID = Button({ id: 'fundDistribution[0].fundId' });
const fundButtonID = Button({ id: 'fundDistributions[0].fundId' });
const valueText = TextField({ name: 'fundDistribution[0].value' });
const valueText1 = TextField({ name: 'fundDistribution[1].value' });
const costDetails = TextField({ name: 'cost.listUnitPrice' });
const fundIDForAnotherOrder = Button({ id: 'fundDistribution[1].fundId' });
const backArrow = Button({ icon: 'arrow-left' });
const open = Button('Open');
const submit = Button('Submit');
const close = Button('Close');
const submitButton = Button('Submit');
const invoiceLines = Section({ id: 'invoiceLines' });
const ordersList = PaneContent({ id: 'order-lines-results-pane-content' });
const POorderDetails = Section({ id: 'order-lines-details' });
const searchForm = SearchField({ id: 'input-record-search' });
const fundDistribution = FieldSet({ id: 'fundDistribution' });
const selectStatusSection = Section({ id: 'status' });
const invoiceLinesSection = Section({ id: 'invoiceLines' });
const fundDistributionSection = Section({ id: 'invoiceLineFundDistribution' });
const POfundDistribution = Section({ id: 'FundDistribution' });
const encumbrancePane = Section({ id: 'pane-transaction-details' });
const crossButton = Button({ icon: 'times' });
const search = TextField({ id: 'input-record-search' });
const searchButton = Button('Search');
const fundResultsPane = Section({ id: 'fund-results-pane' });
const currentBudget = Section({ id: 'currentBudget' });
const budgetInformation = Section({ id: 'information' });

export default {
  createOrder: (orderTypes, templateNames) => {
    cy.do([
      actionsButton.click(),
      newButton.click(),
      orderType.choose(orderTypes),
      Button({ id: 'order-template' }).click(),
      SelectionOption(templateNames).click(),
      saveAndClose.click(),
      Section({ id: 'POListing' }).find(Button('Actions')).click(),
      addPOLine.click(),
    ]);
  },

  createAnotherOrder: (orderTypes, templateNames) => {
    cy.do([
      // newOrderSection.find(actionsButton).click(),
      PaneHeader({ id: 'paneHeaderorders-results-pane' })
        .find(Button('Actions'))
        .click(),
      newButton.click(),
      orderType.choose(orderTypes),
      Button({ id: 'order-template' }).click(),
      SelectionOption(templateNames).click(),
      saveAndClose.click(),
      Section({ id: 'POListing' }).find(Button('Actions')).click(),
      addPOLine.click(),
    ]);
  },
  POlines: (titles, id) => {
    cy.do([
      title.fillIn(titles),
      cy.wait(3000),
      fundDistributions.click(),
      fundID.click(),
      SelectionOption(id).click(),
      saveAndClose.click(),
      backArrow.click(),
    ]);
  },
  POlinesForAnotherOrder: (titles, price, id, valText, valText1) => {
    cy.do([
      title.fillIn(titles),
      cy.wait(3000),
      costDetails.fillIn(price),
      fundDistributions.click(),
      fundIDForAnotherOrder.click(),
      cy.wait(2000),
      SelectionOption(id).click(),
      valueText.fillIn(valText),
      valueText1.fillIn(valText1),
      saveAndClose.click(),
      backArrow.click(),
    ]);
  },
  purchaseOrder: () => {
    cy.do([
      orderDetails.find(Button('Actions')).click(),
      open.click(),
      submit.click(),
      cy.wait(2000),
      close.click(),
    ]);
  },

  purchaseAnotherOrder: () => {
    cy.do([
      orderDetails.find(Button('Actions')).click(),
      open.click(),
      submit.click(),
      cy.wait(2000),
    ]);
  },
  closeOrder: () => {
    // cy.wait(4000)
    PaneHeader({ id: 'paneHeaderorder-details' }).find(crossButton).click();
  },
  searchByNumber: (invoiceNumber) => {
    cy.do([
      SearchField({ id: searhInputId }).selectIndex('Vendor invoice number'),
      SearchField({ id: searhInputId }).fillIn(invoiceNumber),
      searchButton.click(),
    ]);
  },
  searchByKeyword: (invoiceNumber) => {
    cy.do([
      SearchField({ id: searhInputId }).selectIndex('Vendor invoice number'),
      SearchField({ id: searhInputId }).fillIn(invoiceNumber),
      searchButton.click(),
    ]);
  },
  selectInvoice: (invoiceNumber) => {
    cy.do(
      Pane({ id: 'invoice-results-pane' }).find(Link(invoiceNumber)).click()
    );
  },

  addFundDistributionToLine2: (id) => {
    cy.do([
      invoiceLines.find(MultiColumnListRow({ index: 1 })).click(),
      invoiceLineDetailsPane.find(actionsButton).click(),
      Button('Edit').click(),
      fund.find(fundButtonID).click(),
      SelectionOption(id).click(),
      saveAndClose.click(),
    ]);
  },
  addFundDistributionToLine4: (id) => {
    cy.do([
      invoiceLines.find(MultiColumnListRow({ index: 3 })).click(),
      invoiceLineDetailsPane.find(actionsButton).click(),
      Button('Edit').click(),
      fund.find(fundButtonID).click(),
      SelectionOption(id).click(),
      saveAndClose.click(),
    ]);
  },
  approveInvoice: () => {
    cy.do([
      PaneHeader({ id: invoiceDetailsPaneId }).find(actionsButton).click(),
      Button('Approve').click(),
      submitButton.click(),
    ]);
    interactorsTools.checkCalloutMessage(invoiceStates.InvoiceApprovedMessage);
  },
  adjustments: () => {
    cy.do([
      PaneHeader({ id: invoiceDetailsPaneId }).find(actionsButton).click(),
      Button('Edit').click(),
      invoiceLineAdjustments.choose('By amount'),
      saveAndClose.click(),
    ]);
  },
  /** ************** ORDERLINES******************** */

  searchByParameter: (parameter, value) => {
    cy.do([
      searchForm.selectIndex(parameter),
      searchForm.fillIn(value),
      searchButton.click(),
    ]);
  },
  orderList: (POLnumber) => {
    cy.do(ordersList.find(Link(POLnumber)).click());
  },

  PODetails: (id) => {
    cy.do([
      POorderDetails.find(Button('Actions')).click(),
      Button('Edit').click(),
      fundDistribution
        .find(Button({ id: 'fundDistribution[0].fundId' }))
        .click(),
      SelectionOption(id).click(),
      saveAndClose.click(),
    ]);
  },

  selectCurrentEncumbrance: (currentEncumbrance) => {
    cy.do([
      // POfundDistribution.find(Link(currentEncumbrance)).removeAttr('target'),
      cy.xpath('//a[text()="$5.00"]').invoke('removeAttr', 'target').click(),
      encumbrancePane.find(crossButton).click(),
      crossButton.click(), // Transaction details
      crossButton.click(), // budget screen
      search.fillIn('Fund A'),
      searchButton.click(),
      fundResultsPane.find(Link('Fund A')).click(),
      currentBudget.find(MultiColumnListRow({ index: 0 })).click(),
      budgetInformation.find(Link('View transactions')).click(),
    ]);
  },

  /** *****************INVOICES APP*************************** */
  openStatusAndClickCheckbox() {
    cy.do([
      selectStatusSection.find(Button('Status')).click(),
      Checkbox('Reviewed').click(),
      cy.wait(2000),
      MultiColumnList({ id: 'invoices-list' })
        .find(MultiColumnListCell({ row: 3, columnIndex: 0 }))
        .find(Link('234'))
        .click(),
      invoiceLinesSection.find(MultiColumnListRow({ index: 0 })).click(),
      cy.wait(5000),
      fundDistributionSection
        .find(MultiColumnListCell({ row: 0, columnIndex: 5 }))
        .find(Link('$5.00'))
        .click(),
    ]);
  },
};
