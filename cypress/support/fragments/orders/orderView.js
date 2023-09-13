import {
  Button,
  Pane,
  PaneHeader,
  Section,
  KeyValue,
  Accordion,
  MultiColumnListCell,
} from '../../../../interactors';
import Orders from './orders';
import OrderLines from './orderLines';
import InventoryInstance from '../inventory/inventoryInstance';

const openPolDetails = (title) => {
  cy.do(
    Accordion('PO lines')
      .find(MultiColumnListCell({ row: 0, content: title }))
      .click(),
  );
};

export default {
  openPolDetails,

  checkIsOrderOpened: (value) => {
    Orders.selectStatusInSearch('Open');
    cy.expect(Section({ id: 'POSummary' }).find(KeyValue('Workflow status')).has({ value }));
  },

  openReceive: () => {
    cy.do([
      Pane({ id: 'order-details' })
        .find(PaneHeader({ id: 'paneHeaderorder-details' }).find(Button('Actions')))
        .click(),
      Button('Receive').click(),
    ]);
  },

  checkIsItemsInInventoryCreated: (title, location) => {
    openPolDetails(title);
    OrderLines.openInstance();
    InventoryInstance.checkIsInstancePresented(title, location);
  },
};
