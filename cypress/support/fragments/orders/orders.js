import { Button, SearchField, PaneHeader, Pane, Select, Accordion, KeyValue } from '../../../../interactors';
import Helper from '../finance/financeHelper';

const actionsButton = Button('Actions');
const orderDetailsPane = Pane({ id: 'order-details' });
const searhInputId = 'input-record-search';
const searchButton = Button('Search');
const newButton = Button('New');
const saveAndClose = Button('Save & close');
const orderDetailsAccordionId = 'purchaseOrder';
const createdByAdmin = 'ADMINISTRATOR, DIKU ';

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

  openOrderViaActions: () => {
    cy.do([
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(actionsButton)).click(),
      Button('Open').click(),
      Button('Submit').click()
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
    Helper.selectFromResultsList();
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
  }
};
