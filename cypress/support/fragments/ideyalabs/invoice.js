import {
  Button,
  Checkbox,
  FieldSet,
  Link,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Pane,
  PaneContent,
  PaneHeader,
  SearchField,
  Section,
  Select,
  SelectionOption,
  TextField,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';

const invoiceStates = {
  invoiceCreatedMessage: 'Invoice has been saved',
  invoiceLineCreatedMessage: 'Invoice line has been saved',
  invoiceApprovedMessage: 'Invoice has been approved successfully',
};
const actionsButton = Button('Actions');
const invoiceLineDetailsPane = PaneHeader({
  id: 'paneHeaderpane-invoiceLineDetails',
});
const searchInputId = 'input-record-search';
const invoiceDetailsPaneId = 'paneHeaderpane-invoiceDetails';
const invoiceLineAdjustments = Select({ name: 'adjustments[0].prorate' });
const newButton = Button('New');
const orderType = Select('Order type*');
const saveAndCloseButton = Button('Save & close');
const orderDetails = PaneHeader({ id: 'paneHeaderorder-details' });
const addPOLineButton = Button('Add PO line');
const titleField = TextField({ name: 'titleOrPackage' });
const addFundDistributionButton = Button({ id: 'fundDistribution-add-button' });
const fundDistributionFieldSet = FieldSet({ id: 'fundDistributions' });
const fundIDDropdown = Button({ id: 'fundDistribution[0].fundId' });
const fundIDButton = Button({ id: 'fundDistributions[0].fundId' });
const valueText = TextField({ name: 'fundDistribution[0].value' });
const valueText1 = TextField({ name: 'fundDistribution[1].value' });
const costDetails = TextField({ name: 'cost.listUnitPrice' });
const fundIDForAnotherOrder = Button({ id: 'fundDistribution[1].fundId' });
const backArrow = Button({ icon: 'arrow-left' });
const openButton = Button('Open');
const submitButton = Button('Submit');
const closeButton = Button('Close');
const invoiceLines = Section({ id: 'invoiceLines' });
const ordersList = PaneContent({ id: 'order-lines-results-pane-content' });
const orderLineDetails = Section({ id: 'order-lines-details' });
const searchForm = SearchField({ id: 'input-record-search' });
const fundDistribution = FieldSet({ id: 'fundDistribution' });
const selectStatusSection = Section({ id: 'status' });
const invoiceLinesSection = Section({ id: 'invoiceLines' });
const fundDistributionSection = Section({ id: 'invoiceLineFundDistribution' });
const encumbrancePane = Section({ id: 'pane-transaction-details' });
const crossButton = Button({ icon: 'times' });
const searchButton = Button('Search');
const fundResultsPane = Section({ id: 'fund-results-pane' });
const currentBudget = Section({ id: 'currentBudget' });
const budgetInformation = Section({ id: 'information' });
const orderLinesResults = Pane({ id: 'order-lines-results-pane' });

export default {
  createOrder: (orderTypes, templateNames) => {
    cy.do([
      actionsButton.click(),
      newButton.click(),
      orderType.choose(orderTypes),
      Button({ id: 'order-template' }).click(),
      SelectionOption(templateNames).click(),
      saveAndCloseButton.click(),
      Section({ id: 'POListing' }).find(Button('Actions')).click(),
      addPOLineButton.click(),
    ]);
  },

  createAnotherOrder: (orderTypes, templateNames) => {
    cy.do([
      PaneHeader({ id: 'paneHeaderorders-results-pane' })
        .find(Button('Actions'))
        .click(),
      newButton.click(),
      orderType.choose(orderTypes),
      Button({ id: 'order-template' }).click(),
      SelectionOption(templateNames).click(),
      saveAndCloseButton.click(),
      Section({ id: 'POListing' }).find(Button('Actions')).click(),
      addPOLineButton.click(),
    ]);
  },

  POLines: (titles, id) => {
    cy.do(titleField.fillIn(titles));
    cy.expect(addFundDistributionButton.exists());
    cy.do([
      addFundDistributionButton.click(),
      fundIDDropdown.click(),
      SelectionOption(id).click(),
      saveAndCloseButton.click(),
      backArrow.click(),
    ]);
  },

  POLinesForAnotherOrder: (titles, price, id, valText, valText1) => {
    cy.do([
      titleField.fillIn(titles),
      costDetails.fillIn(price),
      addFundDistributionButton.click(),
      fundIDForAnotherOrder.click(),
      SelectionOption(id).click(),
      valueText.fillIn(valText),
      valueText1.fillIn(valText1),
      saveAndCloseButton.click(),
      backArrow.click(),
    ]);
  },

  purchaseOrder: () => {
    cy.do([
      orderDetails.find(Button('Actions')).click(),
      openButton.click(),
      submitButton.click(),
    ]);
    cy.expect(closeButton.exists());
    cy.do(closeButton.click());
  },

  purchaseAnotherOrder: () => {
    cy.do([
      orderDetails.find(Button('Actions')).click(),
      openButton.click(),
      submitButton.click(),
    ]);
  },

  closeOrder: () => {
    PaneHeader({ id: 'paneHeaderorder-details' }).find(crossButton).click();
  },

  searchByNumber: (invoiceNumber) => {
    cy.do([
      SearchField({ id: searchInputId }).selectIndex('Vendor invoice number'),
      SearchField({ id: searchInputId }).fillIn(invoiceNumber),
      searchButton.click(),
    ]);
  },

  searchByKeyword: (invoiceNumber) => {
    cy.do([
      SearchField({ id: searchInputId }).selectIndex('Vendor invoice number'),
      SearchField({ id: searchInputId }).fillIn(invoiceNumber),
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
      fundDistributionFieldSet.find(fundIDButton).click(),
      SelectionOption(id).click(),
      saveAndCloseButton.click(),
    ]);
  },

  addFundDistributionToLine4: (id) => {
    cy.do([
      invoiceLines.find(MultiColumnListRow({ index: 3 })).click(),
      invoiceLineDetailsPane.find(actionsButton).click(),
      Button('Edit').click(),
      fundDistributionFieldSet.find(fundIDButton).click(),
      SelectionOption(id).click(),
      saveAndCloseButton.click(),
    ]);
  },

  approveInvoice: () => {
    cy.do([
      PaneHeader({ id: invoiceDetailsPaneId }).find(actionsButton).click(),
      Button('Approve').click(),
      submitButton.click(),
    ]);
    InteractorsTools.checkCalloutMessage(invoiceStates.invoiceApprovedMessage);
  },

  adjustments: () => {
    cy.do([
      PaneHeader({ id: invoiceDetailsPaneId }).find(actionsButton).click(),
      Button('Edit').click(),
      invoiceLineAdjustments.choose('By amount'),
      saveAndCloseButton.click(),
    ]);
  },

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

  orderLinesResults: () => {
    cy.expect(orderLinesResults.exists());
  },

  PODetails: (id) => {
    cy.do([
      orderLineDetails.find(Button('Actions')).click(),
      Button('Edit').click(),
      fundDistribution
        .find(Button({ id: 'fundDistribution[0].fundId' }))
        .click(),
      SelectionOption(id).click(),
      saveAndCloseButton.click(),
    ]);
    cy.expect(Section({ id: 'order-lines-details' }).exists());
  },

  clickOnViewTransactions: () => {
    const buttonInteractor = Section({ id: 'FundDistribution' })
      .find(MultiColumnListCell({ row: 0, columnIndex: 5 }))
      .find(Button());
    cy.do([
      buttonInteractor.perform((interactor) => interactor.removeAttribute('target')),
      buttonInteractor.click(),
      encumbrancePane.find(crossButton).click(),
      crossButton.click(), // Transaction details
      crossButton.click(), // budget screen
      searchForm.fillIn('Fund A'),
      searchButton.click(),
      fundResultsPane.find(Link('Fund A')).click(),
      currentBudget.find(MultiColumnListRow({ index: 0 })).click(),
      budgetInformation.find(Link('View transactions')).click(),
    ]);
    cy.expect(Section({ id: 'transaction-results-pane' }).exists());
  },

  verifyTransactionsPane() {
    const buttonInteractor = fundDistributionSection
      .find(MultiColumnListCell({ row: 0, columnIndex: 5 }))
      .find(Button());
    cy.do([
      selectStatusSection.find(Button('Status')).click(),
      Checkbox('Reviewed').click(),
      MultiColumnList({ id: 'invoices-list' })
        .find(MultiColumnListCell({ row: 3, columnIndex: 0 }))
        .find(Link('234'))
        .click(),
      invoiceLinesSection.find(MultiColumnListRow({ index: 0 })).click(),
      buttonInteractor.perform((interactor) => interactor.removeAttribute('target')),
      buttonInteractor.click(),
    ]);
    cy.expect(
      Section({ id: 'transaction-results-pane' })
        .find(MultiColumnListRow({ index: 0 }))
        .exists()
    );
  },
};
