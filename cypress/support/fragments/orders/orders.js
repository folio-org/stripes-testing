import { Button, SearchField, PaneHeader, Pane } from '../../../../interactors';

const actionsButtonName = 'Actions';

export default {

  createOrderWithOrderLineViaApi(order, orderLine) {
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.createOrderApi(order)
      .then((response) => {
        cy.log('po id: ' + response.body.poNumber);
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
      Pane({ id: 'order-details' })
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(Button(actionsButtonName))).click(),
      Button('Open').click(),
      Button('Submit').click()
    ]);
  },

  receiveOrderViaActions: () => {
    cy.do([
      Pane({ id: 'order-details' })
        .find(PaneHeader({ id: 'paneHeaderorder-details' })
          .find(Button(actionsButtonName))).click(),
      Button('Receive').click(),
      PaneHeader('Receiving').is({ visible: true })
    ]);
  }
};
