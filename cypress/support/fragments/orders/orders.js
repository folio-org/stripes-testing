import { Button, SearchField, PaneHeader, Pane } from '../../../../interactors';

const actionsButton = Button('Actions');
const orderDetailsPane = Pane({ id: 'order-details' });

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
  }
};
