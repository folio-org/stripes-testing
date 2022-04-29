import { Button, SearchField, PaneHeader, Pane, Select, Accordion, KeyValue, Checkbox, MultiColumnList, MultiColumnListCell, MultiColumnListRow, Modal, TextField, SelectionOption } from '../../../../interactors';
import SearchHelper from '../finance/financeHelper';
import InteractorsTools from '../../utils/interactorsTools';

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
      SearchField({ id: 'input-record-search' }).selectIndex(parameter),
      SearchField({ id: 'input-record-search' }).fillIn(value),
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

  closeOrder: (reason) => {
    cy.do([
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(actionsButton)).click(),
      Button('Close order').click(),
      Select('Reason').choose(reason),
      Button('Submit').click()
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
    cy.do([
      Select('Order type*').choose(order.orderType),
      saveAndClose.click()
    ]);
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

  checkSearchResults: (orderLine) => {
    cy.expect(MultiColumnList({ id: 'orders-list' })
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: orderLine }));
  },
  checkOrderlineSearchResults: (orderNumber) => {
    cy.expect(MultiColumnList({ id: 'order-line-list' })
      .find(MultiColumnListRow({ index: 0 }))
      .find(MultiColumnListCell({ columnIndex: 0 }))
      .has({ content: orderNumber }));
  },
  closeThirdPane: () => {
    cy.do(PaneHeader({ id: 'paneHeaderorder-details' }).find(Button({ icon: 'times' })).click());
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
      Button({ id: 'accordion-toggle-button-ongoing.renewalDate' }).click(),
      Button({ id: 'closeReason.reason-selection' }).click(),
      SelectionOption({ id: '' }).click(),
    ]);
  },
  selectReEncumberFilter: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-reEncumber' }).click(),
      Checkbox({ id: 'clickable-filter-reEncumber-true' }).click(),
    ]);
  },
  selectRenewalDateFilter: () => {
    cy.do([
      Button({ id: 'accordion-toggle-button-ongoing.renewalDate' }).click(),
      Button({ id: 'filter-vendor-button' }).click(),
      // Modal('Select Organization').find(SearchField({ id: searhInputId })).fillIn(invoice.vendorName),
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
  }
};
