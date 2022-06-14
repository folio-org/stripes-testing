import { Button, SearchField, PaneHeader, Pane, Select, Accordion, KeyValue, Checkbox, MultiColumnList, MultiColumnListCell, MultiColumnListRow, Modal, TextField, SelectionOption } from '../../../../interactors';
import SearchHelper from '../finance/financeHelper';
import InteractorsTools from '../../utils/interactorsTools';
import { getLongDelay } from '../../utils/cypressTools';

const actionsButton = Button('Actions');
const orderDetailsPane = Pane({ id: 'order-details' });
const searhInputId = 'input-record-search';
const searchButton = Button('Search');
const newButton = Button('New');
const saveAndClose = Button('Save & close');
const orderDetailsAccordionId = 'purchaseOrder';
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

export default {
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

  searchByParameter: (parameter, value) => {
    cy.do([
      searchForm.selectIndex(parameter),
      searchForm.fillIn(value),
      Button('Search').click(),
    ]);
  },

  openOrder: () => {
    cy.do([
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(actionsButton)).click(),
      Button('Open').click(),
      Button('Submit').click()
    ]);
  },

  editOrder: () => {
    cy.do([
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(actionsButton)).click(),
      Button('Edit').click(),
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

  receiveOrderViaActions: () => {
    cy.do([
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(actionsButton)).click(),
      Button('Receive').click(),
      PaneHeader('Receiving').is({ visible: true })
    ]);
  },

  createOrder(order) {
    cy.do([
      actionsButton.click(),
      newButton.click()
    ]);
    this.selectVendorOnUi(order.vendor);
    cy.intercept('POST', '/orders/composite-orders**').as('newOrderID');
    cy.do([
      Select('Order type*').choose(order.orderType),
      saveAndClose.click()
    ]);
    return cy.wait('@newOrderID', getLongDelay())
      .then(({ response }) => {
        return response.body.id;
      });
  },

  selectVendorOnUi: (organizationName) => {
    cy.do([
      Button({ id: 'vendor-plugin' }).click(),
      SearchField({ id: searhInputId }).fillIn(organizationName),
      searchButton.click()
    ]);
    SearchHelper.selectFromResultsList();
  },

  checkCreatedOrder: (order) => {
    cy.expect(Pane({ id: 'order-details' }).exists());
    cy.expect(Accordion({ id: orderDetailsAccordionId }).find(KeyValue({ value: order.vendor })).exists());
    cy.expect(Accordion({ id: orderDetailsAccordionId }).find(KeyValue({ value: createdByAdmin })).exists());
  },

  selectFromResultsList: (rowNumber = 0) => {
    cy.do(MultiColumnListRow({ index: rowNumber }).click());
  },

  deleteOrderViaActions: () => {
    cy.do([
      PaneHeader({ id: 'paneHeaderorder-details' }).find(actionsButton).click(),
      Button('Delete').click(),
      Button({ id: 'clickable-delete-order-confirmation-confirm' }).click()
    ]);
  },

  resetFilters: () => {
    cy.do(Button('Reset all').click());
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
    cy.expect(MultiColumnList({ id: 'orders-list' })
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: orderNumber }));
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
      Button({ id: 'filter-vendor-button' }).click(),
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

  selectFilterMainLibraryLocationsPOL: () => {
    cy.do([
      buttonLocationFilter.click(),
      Button('Location look-up').click(),
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

  deleteOrderApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `orders/composite-orders/${id}`,
  }),

};

