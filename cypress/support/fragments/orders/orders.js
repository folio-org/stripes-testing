import {
  Button,
  SearchField,
  PaneHeader,
  Pane,
  Select,
  Accordion,
  KeyValue,
  Checkbox,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  Modal,
  TextField,
  HTML,
  including,
  SelectionOption,
  MultiSelect,
  MultiSelectOption,
  Link,
  Section,
  Card,
} from '../../../../interactors';
import SearchHelper from '../finance/financeHelper';
import InteractorsTools from '../../utils/interactorsTools';
import { getLongDelay } from '../../utils/cypressTools';
import DateTools from '../../utils/dateTools';
import FileManager from '../../utils/fileManager';

const numberOfSearchResultsHeader = '//*[@id="paneHeaderorders-results-pane-subtitle"]/span';
const zeroResultsFoundText = '0 records found';
const actionsButton = Button('Actions');
const orderDetailsPane = Pane({ id: 'order-details' });
const searhInputId = 'input-record-search';
const searchButton = Button('Search');
const newButton = Button('New');
const saveAndClose = Button('Save & close');
const orderDetailsAccordion = Accordion({ id: 'purchaseOrder' });
const createdByAdmin = 'ADMINISTRATOR, DIKU ';
const searchField = SearchField({ id: 'input-record-search' });
const admin = 'administrator';
const buttonLocationFilter = Button({ id: 'accordion-toggle-button-pol-location-filter' });
const buttonFundCodeFilter = Button({ id: 'accordion-toggle-button-fundCode' });
const buttonOrderFormatFilter = Button({ id: 'accordion-toggle-button-orderFormat' });
const buttonFVendorFilter = Button({ id: 'accordion-toggle-button-purchaseOrder.vendor' });
const buttonRushFilter = Button({ id: 'accordion-toggle-button-rush' });
const buttonSubscriptionFromFilter = Button({ id: 'accordion-toggle-button-subscriptionFrom' });
const searchForm = SearchField({ id: 'input-record-search' });
const ordersFiltersPane = Pane({ id: 'orders-filters-pane' });
const ordersResultsPane = Pane({ id: 'orders-results-pane' });
const buttonAcquisitionMethodFilter = Button({ id: 'accordion-toggle-button-acquisitionMethod' });
const purchaseOrderSection = Section({ id: 'purchaseOrder' });
const purchaseOrderLineLimitReachedModal = Modal({ id: 'data-test-lines-limit-modal' });
const resetButton = Button('Reset all');

export default {
  searchByParameter(parameter, value) {
    cy.do([
      searchForm.selectIndex(parameter),
      searchForm.fillIn(value),
      Button('Search').click(),
    ]);
  },
  waitLoading() {
    cy.expect([
      ordersFiltersPane.exists(),
      ordersResultsPane.exists(),
    ]);
  },

  waitSettingsPageLoading() {
    cy.expect([
      Pane({ id: 'settings-nav-pane' }).exists(),
      Pane({ id: 'app-settings-nav-pane' }).exists(),
    ]);
  },

  createOrderWithOrderLineViaApi(order, orderLine) {
    cy.createOrderApi(order)
      .then((response) => {
        cy.wrap(response.body.poNumber).as('orderNumber');
        cy.getAcquisitionMethodsApi({ query: 'value="Other"' })
          .then(({ body }) => {
            orderLine.acquisitionMethod = body.acquisitionMethods[0].id;
            orderLine.purchaseOrderId = order.id;
            cy.createOrderLineApi(orderLine);
          });
      });
    return cy.get('@orderNumber');
  },

  openOrder() {
    cy.do([
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(actionsButton)).click(),
      Button('Open').click(),
      Button('Submit').click()
    ]);
    // Need to wait,while order's data will be loaded
    cy.wait(4000);
  },

  editOrder() {
    cy.do([
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(actionsButton)).click(),
      Button('Edit').click(),
    ]);
  },

  approveOrder() {
    cy.do([
      Checkbox('Approved').click(),
      saveAndClose.click()
    ]);
  },

  approveOrderbyActions() {
    cy.do([
      PaneHeader({ id: 'paneHeaderorder-details' }).find(actionsButton).click(),
      Button('Approve').click()
    ]);
  },

  editOrderNumber: (poNumber) => {
    cy.do([
      TextField({ name: 'poNumber' }).fillIn(poNumber),
      saveAndClose.click()
    ]);
  },

  duplicateOrder() {
    cy.do([
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(actionsButton)).click(),
      Button('Duplicate').click(),
      Button({ id: 'clickable-order-clone-confirmation-confirm' }).click(),
    ]);
  },

  assignOrderToAdmin: (rowNumber = 0) => {
    cy.do([
      Button({ id: 'clickable-plugin-find-user' }).click(),
      TextField({ name: 'query' }).fillIn(admin),
      searchButton.click(),
      MultiColumnListRow({ index: rowNumber }).click(),
    ]);
  },

  saveEditingOrder: () => {
    cy.do(saveAndClose.click());
  },

  selectOngoingOrderType: () => {
    cy.do(Select({ name: 'orderType' }).choose('Ongoing'));
  },

  fillOngoingInformation: (newDate) => {
    cy.do([
      Checkbox({ name: 'ongoing.isSubscription' }).click(),
      TextField({ name: 'ongoing.interval' }).fillIn('1'),
      TextField({ name: 'ongoing.renewalDate' }).fillIn(newDate),
    ]);
  },

  closeOrder: (reason) => {
    cy.do([
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(actionsButton)).click(),
      Button('Close order').click(),
      Select('Reason').choose(reason),
      Button('Submit').click(),
    ]);
    InteractorsTools.checkCalloutMessage('Order was closed');
  },

  cancelOrder: () => {
    cy.do([
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(actionsButton)).click(),
      Button('Cancel').click(),
      Button('Submit').click(),
    ]);
    InteractorsTools.checkCalloutMessage('Order was closed');
  },

  editOrderToManual: (orderNumber) => {
    cy.do([
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(actionsButton)).click(),
      Button('Edit').click(),
      Checkbox({ name: 'manualPo' }).click(),
      saveAndClose.click()
    ]);
    InteractorsTools.checkCalloutMessage(`The Purchase order - ${orderNumber} has been successfully saved`);
  },

  unOpenOrder: () => {
    cy.do([
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(actionsButton)).click(),
      Button('Unopen').click(),
      Button({ id: 'clickable-order-unopen-confirmation-confirm-delete-holdings' }).click()
    ]);
  },

  reOpenOrder: () => {
    cy.do([
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(actionsButton)).click(),
      Button('Reopen').click(),
    ]);
  },

  receiveOrderViaActions: () => {
    cy.do([
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(actionsButton)).click(),
      Button('Receive').click(),
      PaneHeader('Receiving').is({ visible: true })
    ]);
  },

  createOrder(order, isApproved = false, isManual = false) {
    cy.do([
      actionsButton.click(),
      newButton.click()
    ]);
    this.selectVendorOnUi(order.vendor);
    cy.intercept('POST', '/orders/composite-orders**').as('newOrderID');
    cy.do(Select('Order type*').choose(order.orderType));
    if (isApproved) cy.do(Checkbox({ name: 'approved' }).click());
    if (isManual) cy.do(Checkbox({ name: 'manualPo' }).click());
    cy.do(saveAndClose.click());
    return cy.wait('@newOrderID', getLongDelay())
      .then(({ response }) => {
        return response.body.id;
      });
  },

  createOrderWithPONumber(poNumber, order, isManual = false) {
    cy.do([
      actionsButton.click(),
      newButton.click(),
      TextField({ name: 'poNumber' }).fillIn(poNumber),
    ]);
    this.selectVendorOnUi(order.vendor);
    cy.intercept('POST', '/orders/composite-orders**').as('newOrderID');
    cy.do(Select('Order type*').choose(order.orderType));
    if (isManual) cy.do(Checkbox({ name: 'manualPo' }).click());
    cy.do(saveAndClose.click());
    return cy.wait('@newOrderID', getLongDelay())
      .then(({ response }) => {
        return response.body.id;
      });
  },

  createOrderWithPONumberPreffixSuffix(poPreffix, poSuffix, poNumber, order, isManual = false) {
    cy.do([
      actionsButton.click(),
      newButton.click(),
      TextField({ name: 'poNumber' }).fillIn(poNumber),
      Select({ name: 'poNumberPrefix' }).choose(poPreffix),
      Select({ name: 'poNumberSuffix' }).choose(poSuffix),
    ]);
    this.selectVendorOnUi(order.vendor);
    cy.intercept('POST', '/orders/composite-orders**').as('newOrderID');
    cy.do(Select('Order type*').choose(order.orderType));
    if (isManual) cy.do(Checkbox({ name: 'manualPo' }).click());
    cy.do(saveAndClose.click());
    return cy.wait('@newOrderID', getLongDelay())
      .then(({ response }) => {
        return response.body.id;
      });
  },

  createOrderByTemplate(templateName) {
    cy.do([
      actionsButton.click(),
      newButton.click(),
      Button({ id: 'order-template' }).click(),
      SelectionOption(templateName).click(),
      saveAndClose.click()
    ]);
  },

  createOrderForRollover(order, isApproved = false) {
    cy.do([
      actionsButton.click(),
      newButton.click()
    ]);
    this.selectVendorOnUi(order.vendor);
    cy.intercept('POST', '/orders/composite-orders**').as('newOrder');
    cy.do(Select('Order type*').choose(order.orderType));
    if (isApproved) cy.do(Checkbox({ name: 'approved' }).click());
    cy.do(saveAndClose.click());
    return cy.wait('@newOrder', getLongDelay())
      .then(({ response }) => {
        return response.body;
      });
  },

  checkZeroSearchResultsHeader: () => {
    cy.xpath(numberOfSearchResultsHeader)
      .should('be.visible')
      .and('have.text', zeroResultsFoundText);
  },

  createOrderWithAU(order, AUName, poNumber, isApproved = false) {
    cy.do([
      actionsButton.click(),
      newButton.click()
    ]);
    this.selectVendorOnUi(order.vendor);
    cy.intercept('POST', '/orders/composite-orders**').as('newOrderID');
    cy.do(Select('Order type*').choose(order.orderType));
    cy.do([
      MultiSelect({ id: 'order-acq-units' }).find(Button({ ariaLabel: 'open menu' })).click(),
      MultiSelectOption(AUName).click(),
    ]);
    if (isApproved) cy.do(Checkbox({ name: 'approved' }).click());
    cy.do(saveAndClose.click());
    return cy.wait('@newOrderID', getLongDelay());
  },

  selectVendorOnUi: (organizationName) => {
    cy.do([
      Button('Organization look-up').click(),
      SearchField({ id: searhInputId }).fillIn(organizationName),
      searchButton.click()
    ]);
    SearchHelper.selectFromResultsList();
  },

  checkCreatedOrder: (order) => {
    cy.expect(Pane({ id: 'order-details' }).exists());
    cy.expect(orderDetailsAccordion
      .find(KeyValue({ value: order.vendor }))
      .exists());
    cy.expect(orderDetailsAccordion
      .find(KeyValue({ value: createdByAdmin }))
      .exists());
  },

  checkCreatedOngoingOrder: (order) => {
    cy.expect(Pane({ id: 'order-details' }).exists());
    cy.expect(orderDetailsAccordion
      .find(KeyValue({ value: order.vendor }))
      .exists());
    cy.expect(orderDetailsAccordion
      .find(KeyValue({ value: order.orderType }))
      .exists());
  },

  checkDuplicatedOrder: (organization, user) => {
    cy.expect(Pane({ id: 'order-details' }).exists());
    cy.expect(Section({ id: 'POSummary' })
      .find(KeyValue({ value: 'Pending' }))
      .exists());
    cy.expect(purchaseOrderSection
      .find(KeyValue({ value: organization }))
      .exists());
    cy.expect(purchaseOrderSection
      .find(KeyValue({ value: user }))
      .exists());
  },

  checkCreatedOrderFromTemplate: (organization) => {
    cy.expect(Pane({ id: 'order-details' }).exists());
    cy.expect(orderDetailsAccordion
      .find(KeyValue({ value: organization }))
      .exists());
  },

  checkCreatedOrderWithOrderNumber: (organization, orderNumber) => {
    cy.expect(Pane({ id: 'order-details' }).exists());
    cy.expect([
      orderDetailsAccordion
        .find(KeyValue({ value: organization }))
        .exists(),
      orderDetailsAccordion
        .find(KeyValue({ value: orderNumber }))
        .exists(),
    ]);
  },

  selectFromResultsList(number) {
    cy.do(MultiColumnList({ id: 'orders-list' }).find(Link(number)).click());
  },

  deleteOrderViaActions: () => {
    cy.do([
      PaneHeader({ id: 'paneHeaderorder-details' }).find(actionsButton).click(),
      Button('Delete').click(),
      Button({ id: 'clickable-delete-order-confirmation-confirm' }).click()
    ]);
  },

  resetFilters: () => {
    cy.do(resetButton.click());
    cy.expect(resetButton.is({ disabled: true }));
  },

  selectStatusInSearch: (orderStatus) => {
    cy.do(Accordion({ id: 'workflowStatus' }).clickHeader());
    switch (orderStatus) {
      case 'Closed':
        cy.do(Checkbox({ id: 'clickable-filter-workflowStatus-closed' }).click());
        break;
      case 'Open':
        cy.do(Checkbox({ id: 'clickable-filter-workflowStatus-open' }).click());
        break;
      case 'Pending':
        cy.do(Checkbox({ id: 'clickable-filter-workflowStatus-pending' }).click());
        break;
      default:
        cy.log('No such status like ' + orderStatus + '. Please use Closed, Open or Pending');
    }
  },

  checkSearchResults: (orderNumber) => {
    cy.expect(MultiColumnList({ id: 'orders-list' }).find(Link(orderNumber)).exists());
  },
  checkSearchResultsWithClosedOrder: (orderNumber) => {
    cy.expect(MultiColumnList({ id: 'orders-list' })
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: `${orderNumber}\u00a0Canceled` }));
  },
  checkOrderlineSearchResults: (orderLineNumber) => {
    cy.expect(MultiColumnList({ id: 'order-line-list' })
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: orderLineNumber }));
  },
  checkOrderlineFilterInList: (orderLineNumber) => {
    cy.expect(MultiColumnList({ id: 'order-line-list' })
      .has(Link(orderLineNumber)));
  },
  closeThirdPane: () => {
    cy.do([
      Button('Collapse all').click(),
      PaneHeader({ id: 'paneHeaderorder-details' }).find(Button({ icon: 'times' })).click()
    ]);
  },

  getSearchParamsMap(orderNumber, currentDate) {
    const searchParamsMap = new Map();
    // 'date opened' parameter verified separately due to different condition
    searchParamsMap.set('PO number', orderNumber)
      .set('Keyword', orderNumber)
      .set('Date created', currentDate);
    return searchParamsMap;
  },
  checkPoSearch(searchParamsMap, orderNumber) {
    for (const [key, value] of searchParamsMap.entries()) {
      cy.do([
        searchField.selectIndex(key),
        searchField.fillIn(value),
        Button('Search').click(),
      ]);
      // verify that first row in the result list contains related order line title
      this.checkSearchResults(orderNumber);
      this.resetFilters();
      // TODO: remove waiter - currenty it's a workaround for incorrect selection from search list
      cy.wait(1000);
    }
  },
  selectOpenStatusFilter: () => {
    cy.do(Checkbox('Open').click());
  },
  selectClosedStatusFilter: () => {
    cy.do(Checkbox('Closed').click());
  },
  selectPrefixFilter: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-poNumberPrefix' }).click(),
      Button({ id: 'poNumberPrefix-selection' }).click(),
      SelectionOption({ id: 'option-poNumberPrefix-selection-0-pref' }).click(),
    ]);
  },
  selectApprovedFilter: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-approved' }).click(),
      Checkbox({ id: 'clickable-filter-approved-true' }).click(),
    ]);
  },
  selectAssignedToFilter: (rowNumber = 0) => {
    cy.do([
      Button({ id: 'accordion-toggle-button-assignedTo' }).click(),
      Button({ id: 'assignedTo-button' }).click(),
      TextField({ name: 'query' }).fillIn(admin),
      searchButton.click(),
      MultiColumnListRow({ index: rowNumber }).click(),
    ]);
  },
  selectOrderTypeFilter: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-orderType' }).click(),
      Checkbox('One-time').click(),
    ]);
  },
  selectVendorFilter: (invoice) => {
    cy.do([
      Button({ id: 'accordion-toggle-button-filter-vendor' }).click(),
      Button('Organization look-up').click(),
      Modal('Select Organization').find(SearchField({ id: searhInputId })).fillIn(invoice.vendorName),
      searchButton.click(),
    ]);
    SearchHelper.selectFromResultsList();
  },
  selectReasonForClosureFilter: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-closeReason.reason' }).click(),
      Button({ id: 'closeReason.reason-selection' }).click(),
      SelectionOption({ id: 'option-closeReason.reason-selection-0-Cancelled' }).click(),
    ]);
  },
  selectReEncumberFilter: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-reEncumber' }).click(),
      Checkbox({ id: 'clickable-filter-reEncumber-true' }).click(),
    ]);
  },
  selectRenewalDateFilter: (newDate) => {
    cy.do([
      Button({ id: 'accordion-toggle-button-ongoing.renewalDate' }).click(),
      TextField('From').fillIn(newDate),
      TextField('To').fillIn(newDate),
      Button('Apply').click(),
    ]);
  },
  selectBillToFilter: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-billTo' }).click(),
      Button({ id: 'billTo-selection' }).click(),
      SelectionOption({ id: 'option-billTo-selection-0-72e1b584-d345-43e4-964c-d7bbb59d1f02' }).click(),
    ]);
  },
  selectOrderLines: () => {
    cy.do(Button('Order lines').click());
  },
  selectOrders: () => {
    cy.do(Button('Orders').click());
  },
  createPOLineViaActions: () => {
    cy.do([
      Accordion({ id: 'POListing' })
        .find(Button('Actions'))
        .click(),
      Button('Add PO line').click()
    ]);
  },

  backToPO: () => {
    cy.do(Button({ id: 'clickable-backToPO' }).click());
  },

  selectFilterMainLibraryLocationsPOL: () => {
    cy.do([
      buttonLocationFilter.click(),
      Button('Location look-up').click(),
      Select({ name: 'institutionId' }).choose('Københavns Universitet'),
      Select({ name: 'campusId' }).choose('City Campus'),
      Button({ id: 'locationId' }).click(),
      SelectionOption('Main Library (KU/CC/DI/M) ').click(),
      Button('Save and close').click(),
      buttonLocationFilter.click(),
    ]);
  },
  selectFilterFundCodeUSHISTPOL: () => {
    cy.do([
      buttonFundCodeFilter.click(),
      Button({ id: 'fundCode-selection' }).click(),
      SelectionOption('USHIST').click(),
      buttonFundCodeFilter.click(),
    ]);
  },
  selectFilterOrderFormatPhysicalResourcePOL: () => {
    cy.do([
      buttonOrderFormatFilter.click(),
      Checkbox({ id: 'clickable-filter-orderFormat-physical-resource' }).click(),
      buttonOrderFormatFilter.click(),
    ]);
  },
  selectFilterAcquisitionMethod: (AUmethod) => {
    cy.do([
      buttonAcquisitionMethodFilter.click(),
      MultiSelect({ id: 'acq-methods-filter' }).select([AUmethod]),
      buttonAcquisitionMethodFilter.click(),
    ]);
  },
  selectFilterVendorPOL: (invoice) => {
    cy.do([
      buttonFVendorFilter.click(),
      Button({ id: 'purchaseOrder.vendor-button' }).click(),
      Modal('Select Organization').find(SearchField({ id: searhInputId })).fillIn(invoice.vendorName),
      searchButton.click(),
    ]);
    SearchHelper.selectFromResultsList();
    cy.do(buttonFVendorFilter.click());
  },
  selectFilterNoInRushPOL: () => {
    cy.do([
      buttonRushFilter.click(),
      Checkbox({ id: 'clickable-filter-rush-false' }).click(),
      buttonRushFilter.click(),
    ]);
  },
  selectFilterSubscriptionFromPOL: (newDate) => {
    cy.do([
      buttonSubscriptionFromFilter.click(),
      TextField('From').fillIn(newDate),
      TextField('To').fillIn(newDate),
      Button('Apply').click(),
      buttonSubscriptionFromFilter.click(),
    ]);
  },
  getOrdersApi: (searchParams) => {
    return cy
      .okapiRequest({
        path: 'orders/composite-orders',
        searchParams,
        isDefaultSearchParamsRequired: false
      })
      .then(({ body }) => {
        return body.purchaseOrders;
      });
  },

  deleteOrderViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `orders/composite-orders/${id}`,
    isDefaultSearchParamsRequired: false,
  }),

  checkIsOrderCreated: (orderNumber) => {
    cy.do(Checkbox({ id: 'clickable-filter-workflowStatus-pending' }).click());
    cy.expect(MultiColumnList({ id: 'orders-list' }).find(HTML(including(orderNumber))).exists());
  },

  exportResoultsCSV: () => {
    cy.do([
      actionsButton.click(),
      Button({ id: 'clickable-export-csv' }).click(),
      // Modal('Export settings').find(RadioButton({ ariaLabel: 'Export all line fields' })).click(),
      Button('Export').click(),
    ]);
  },

  verifySaveCSVQueryFileName(actualName) {
    // valid name example: order-export-2022-06-24-12_08.csv
    const expectedFileNameMask = /order-export-\d{4}-\d{2}-\d{2}-\d{2}_\d{2}.csv/gm;
    expect(actualName).to.match(expectedFileNameMask);

    const fileName = FileManager.getFileNameFromFilePath(actualName);
    const actualDateString = fileName.match(/\d{4}-\d{2}-\d{2}/gm)[0];
    DateTools.verifyDate(Date.parse(actualDateString), 86400000);
  },

  verifySaveCSVQuery(actualQuery, kw = '*', lang = 'eng') {
    cy.url().then((url) => {
      const params = new URLSearchParams(url.split('?')[1]);
      const effectiveLocationId = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/gm.exec(params.get('filters'))[0];
      const expectedText = `((keyword all "${kw}" or isbn="${kw}") and languages=="${lang}" and items.effectiveLocationId=="${effectiveLocationId}") sortby title`;
      expect(actualQuery).to.eq(expectedText);
    });
  },

  selectPendingStatusFilter: () => {
    cy.do(Checkbox({ id: 'clickable-filter-workflowStatus-pending' }).click());
  },

  selectOngoingOrderTypeInPOForm: () => {
    cy.do(Select('Order type*').choose('Ongoing'));
  },

  checkEditedOngoingOrder: (orderNumber, organizationName) => {
    cy.expect(Pane({ id: 'order-details' }).exists());
    cy.expect(orderDetailsAccordion.find(KeyValue({ value: orderNumber })).exists());
    cy.expect(orderDetailsAccordion.find(KeyValue({ value: organizationName })).exists());
    cy.expect(orderDetailsAccordion.find(KeyValue({ value: 'Ongoing' })).exists());
  },

  errorMessage: (modalName, errorContent) => {
    cy.expect(Modal(modalName).content(errorContent));
  },

  checkPurchaseOrderLineLimitReachedModal: () => {
    cy.expect([
      purchaseOrderLineLimitReachedModal.exists(),
      purchaseOrderLineLimitReachedModal.find(Button('Ok')).exists(),
      purchaseOrderLineLimitReachedModal.find(Button('Create new purchase order')).exists(),
    ]);
  },

  openVersionHistory() {
    cy.do(Section({ id: 'order-details' }).find(Button({ icon: 'clock' })).click());
    cy.wait(2000);
    cy.expect([
      Section({ id: 'POListing' }).absent(),
      Section({ id: 'relatedInvoices' }).absent(),
      Section({ id: 'versions-history-pane-order' }).exists(),
    ]);
  },

  checkVersionHistoryCard(date, textInformation) {
    cy.expect([
      Section({ id: 'versions-history-pane-order' }).find(Card({ headerStart: date })).has({ text: textInformation }),
    ]);
  },

  selectVersionHistoryCard(date) {
    cy.do([
      Section({ id: 'versions-history-pane-order' }).find(Card({ headerStart: date })).find(Button({ icon: 'clock' })).click(),
    ]);
  },

  closeVersionHistory: () => {
    cy.do(Section({ id: 'versions-history-pane-order' }).find(Button({ icon: 'times' })).click());
    cy.wait(2000);
    cy.expect([
      Section({ id: 'POListing' }).exists(),
      Section({ id: 'relatedInvoices' }).exists(),
      Section({ id: 'versions-history-pane-order' }).absent(),
    ]);
  },

  checkOrderStatus(orderStatus) {
    cy.expect(Section({ id: 'POSummary' }).find(KeyValue('Workflow status')).has({ value: orderStatus }));
  },

  checkReviewDateOnOngoingOrder() {
    cy.expect(Section({ id: 'ongoing' }).find(KeyValue('Review date')).has({ value: 'No value set-' }));
  },

  selectFundIDFromthelist: () => {
    const buttonInteractor = Section({
      id: 'FundDistribution',
    }).find(MultiColumnListCell({ row: 0, columnIndex: 5 }))
      .find(Button());
    cy.do([
      buttonInteractor.perform((interactor) => interactor.removeAttribute('target')),
      buttonInteractor.click(),
    ]);
  },
};
