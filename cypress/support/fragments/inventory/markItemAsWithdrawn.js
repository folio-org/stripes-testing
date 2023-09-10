import { HTML, including } from '@interactors/html';
import { Button, Modal } from '../../../../interactors';

const actionsButton = Button('Actions');
const confirmItemWithdrawnModal = Modal('Confirm item status: Withdrawn');

export default {
  // to reuse functions, it's named missing, but compliant with withdrawn
  itemsToMarkAsMissing: [
    'Available',
    'Awaiting pickup',
    'In transit',
    'Awaiting delivery',
    'Paged',
    'In process',
    'Missing',
    'Lost and paid',
  ],

  // to reuse functions, it's named missing, but compliant with withdrawn
  itemsNotToMarkAsMissing: [
    'Withdrawn',
    'On order',
    'Declared lost',
    'Claimed returned',
    'Checked out',
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
