import {
  Button,
  Pane,
  PaneHeader,
  Section,
  KeyValue,
  MultiColumnListCell,
} from '../../../../interactors';
import OrderLines from './orderLines';
import InventoryInstance from '../inventory/inventoryInstance';
import CreateInvoiceModal from './modals/createInvoiceModal';
import UnopenConfirmationModal from './modals/unopenConfirmationModal';

const orderDetailsPane = Pane({ id: 'order-details' });
const actionsButton = Button('Actions');

const polListingAccordion = Section({ id: 'POListing' });

const openPolDetails = (title) => {
  cy.do(polListingAccordion.find(MultiColumnListCell({ content: title })).click());
};

export default {
  openPolDetails,
  checkOrderStatus(orderStatus) {
    cy.expect(
      Section({ id: 'POSummary' }).find(KeyValue('Workflow status')).has({ value: orderStatus }),
    );
  },
  expandActionsDropdown() {
    cy.do(
      orderDetailsPane
        .find(PaneHeader({ id: 'paneHeaderorder-details' }).find(actionsButton))
        .click(),
    );
  },
  unOpenOrder({ orderNumber, checkinItems = false, confirm = true } = {}) {
    this.expandActionsDropdown();
    cy.do(Button('Unopen').click());

    if (orderNumber) {
      UnopenConfirmationModal.verifyModalView({ orderNumber, checkinItems });
    }

    if (confirm) {
      UnopenConfirmationModal.confirm();
    }
  },
  createNewInvoice({ confirm = true } = {}) {
    this.expandActionsDropdown();
    cy.do(Button('New invoice').click());

    CreateInvoiceModal.verifyModalView();

    if (confirm) {
      CreateInvoiceModal.confirm();
    }
  },
  openReceive() {
    cy.do([
      Pane({ id: 'order-details' })
        .find(PaneHeader({ id: 'paneHeaderorder-details' }).find(Button('Actions')))
        .click(),
      Button('Receive').click(),
    ]);
  },
  checkIsItemsInInventoryCreated(title, location) {
    openPolDetails(title);
    OrderLines.openInstance();
    InventoryInstance.checkIsInstancePresented(title, location);
  },
};
