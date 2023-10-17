import {
  Button,
  Pane,
  PaneHeader,
  Section,
  KeyValue,
  MultiColumnListCell,
} from '../../../../interactors';
import InteractorsTools from '../../utils/interactorsTools';
import OrderLines from './orderLines';
import OrderLineDetails from './orderLineDetails';
import InventoryInstance from '../inventory/inventoryInstance';
import CreateInvoiceModal from './modals/createInvoiceModal';
import UnopenConfirmationModal from './modals/unopenConfirmationModal';

const orderDetailsPane = Pane({ id: 'order-details' });
const actionsButton = Button('Actions');

const polListingAccordion = Section({ id: 'POListing' });

const openPolDetails = (title) => {
  cy.do(polListingAccordion.find(MultiColumnListCell({ content: title })).click());

  OrderLineDetails.waitLoading();

  return OrderLineDetails;
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
  reOpenOrder({ orderNumber, checkMessage = true } = {}) {
    this.expandActionsDropdown();
    cy.do(Button('Reopen').click());

    if (checkMessage) {
      InteractorsTools.checkCalloutMessage(
        `The Purchase order - ${orderNumber} has been successfully reopened`,
      );
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
