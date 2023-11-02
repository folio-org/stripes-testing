import {
  Button,
  Checkbox,
  Link,
  Modal,
  PaneContent,
  PaneHeader,
  Section,
} from '../../../interactors';

const ordersButton = Button('Orders');
const ordersPane = PaneContent({ id: 'orders-filters-pane-content' });
const statusDropDown = Button('Status');
const openCheckBox = Checkbox('Open');
const poNumber = Link('21211');
const actionsButton = Button('Actions');
const ordersSection = Section({ id: 'order-details' });
const paneHeaderOrderDetails = PaneHeader({ id: 'paneHeaderorder-details' });
const orderDetailsActions = Section({ id: 'order-details-actions' });
const reExportButton = Button('Re-export');
const reExportModal = Modal({ id: 'reexport-order-confirm-modal' });
const confirmButton = Button('Confirm');

export default {
  switchToOrders: () => {
    cy.do(ordersPane.find(ordersButton).click());
  },
  status: () => {
    cy.do([ordersPane.find(statusDropDown).click(), openCheckBox.click()]);
  },
  poNumberRecord: () => {
    cy.do(poNumber.click());
  },
  reExportActions() {
    cy.do([
      ordersSection.find(paneHeaderOrderDetails).find(actionsButton).click(),
      orderDetailsActions.find(reExportButton).click(),
    ]);
  },
  reExportOrderModal: () => {
    cy.do(reExportModal.find(confirmButton).click());
  },
};
