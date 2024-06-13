import { HTML, including } from '@interactors/html';
import { Button, Modal } from '../../../../interactors';
import { ITEM_STATUS_NAMES } from '../../constants';

const actionsButton = Button('Actions');
const confirmItemWithdrawnModal = Modal('Confirm item status: Withdrawn');

export default {
  // to reuse functions, it's named missing, but compliant with withdrawn
  itemsToMarkAsMissing: [
    ITEM_STATUS_NAMES.AVAILABLE,
    ITEM_STATUS_NAMES.AWAITING_PICKUP,
    ITEM_STATUS_NAMES.IN_TRANSIT,
    ITEM_STATUS_NAMES.AWAITING_DELIVERY,
    ITEM_STATUS_NAMES.PAGED,
    ITEM_STATUS_NAMES.IN_PROCESS,
    ITEM_STATUS_NAMES.MISSING,
    ITEM_STATUS_NAMES.LOST_AND_PAID,
  ],

  // to reuse functions, it's named missing, but compliant with withdrawn
  itemsNotToMarkAsMissing: [
    ITEM_STATUS_NAMES.WITHDRAWN,
    ITEM_STATUS_NAMES.ON_ORDER,
    ITEM_STATUS_NAMES.DECLARED_LOST,
    ITEM_STATUS_NAMES.CLAIMED_RETURNED,
    ITEM_STATUS_NAMES.CHECKED_OUT,
  ],

  itemStatusesToCreate() {
    return [...this.itemsToMarkAsMissing, ...this.itemsNotToMarkAsMissing];
  },

  withdrawItemButton: Button('Withdrawn'),
  newRequestButton: Button('New Request'),

  getWithdrawnItem(items) {
    return items.find(({ status: { name } }) => name === 'Withdrawn');
  },

  clickMarkAsWithdrawn() {
    cy.do([actionsButton.click(), this.withdrawItemButton.click()]);
  },

  checkActionButtonExists({ isExist, button }) {
    cy.do(actionsButton.click());
    if (isExist) {
      cy.expect(button.exists());
    } else {
      cy.expect(button.absent());
    }
    cy.do(actionsButton.click());
  },

  checkIsconfirmItemWithdrawnModalExist(instanceTitle, itemBarcode, materialType) {
    const modalContent = `${instanceTitle} (${materialType}) (Barcode: ${itemBarcode})'s item status will be marked as Withdrawn.`;
    cy.expect(confirmItemWithdrawnModal.find(HTML(including(modalContent))).exists());
    cy.expect(confirmItemWithdrawnModal.find(Button('Cancel')).exists());
    cy.expect(confirmItemWithdrawnModal.find(Button('Confirm')).exists());
  },

  cancelModal() {
    cy.do(confirmItemWithdrawnModal.find(Button('Cancel')).click());
  },

  confirmModal() {
    cy.do(confirmItemWithdrawnModal.find(Button('Confirm')).click());
  },
};
