import { Modal, Button, including, HTML } from '../../../../../interactors';

const deleteHoldingsModal = Modal({ id: 'delete-holdings-confirmation' });

const cancelButton = deleteHoldingsModal.find(Button('Cancel'));
const keepHoldingsButton = deleteHoldingsModal.find(Button('Keep Holdings'));
const deleteHoldingsButton = deleteHoldingsModal.find(Button('Delete Holdings'));
const modalMessage =
  'This piece is connected to records in inventory. After this edit there will be no other purchase order lines, pieces OR items connected to the related Holdings record(s). After making this change would you like FOLIO to delete the Holdings record(s)?';

export default {
  deleteHoldingsModal({ action, locations = [] }) {
    const holdingsToDelete = locations.map((location) => location.name);
    cy.expect([
      deleteHoldingsModal.has({ header: 'Delete Holdings' }),
      deleteHoldingsModal.has({ message: including(modalMessage) }),
      [cancelButton, keepHoldingsButton, deleteHoldingsButton].map((button) => button.has({ visible: true, disabled: false })),
    ]);

    if (holdingsToDelete.length > 0) {
      holdingsToDelete.forEach((locationName) => {
        cy.expect(deleteHoldingsModal.find(HTML({ text: including(locationName) })).exists());
      });
    }

    switch (action) {
      case 'Cancel':
        cy.do(cancelButton.click());
        break;
      case 'Keep Holdings':
        cy.do(keepHoldingsButton.click());
        break;
      case 'Delete Holdings':
        cy.do(deleteHoldingsButton.click());
        break;
      default:
        throw new Error(`Invalid action: ${action}`);
    }
    cy.expect(deleteHoldingsModal.absent());
  },
};
