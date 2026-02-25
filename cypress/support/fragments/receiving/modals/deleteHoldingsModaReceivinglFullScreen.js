import { Modal, Button, including, HTML } from '../../../../../interactors';
import { DELETE_HOLDINGS_ACTIONS } from '../../../constants';

const deleteHoldingsModal = Modal({ id: 'delete-holdings-confirmation' });
const modalMessage =
  'This piece is connected to records in inventory. After this edit there will be no other purchase order lines, pieces OR items connected to the related Holdings record(s). After making this change would you like FOLIO to delete the Holdings record(s)?';

const deleteHoldingsButtons = {
  [DELETE_HOLDINGS_ACTIONS.CANCEL]: () => deleteHoldingsModal.find(Button('Cancel')),
  [DELETE_HOLDINGS_ACTIONS.KEEP]: () => deleteHoldingsModal.find(Button('Keep Holdings')),
  [DELETE_HOLDINGS_ACTIONS.DELETE]: () => deleteHoldingsModal.find(Button('Delete Holdings')),
};

export default {
  deleteHoldingsModal({ action, locations = [] }) {
    const holdingsToDelete = locations.map((location) => location.name);
    cy.expect([
      deleteHoldingsModal.has({ header: 'Delete Holdings' }),
      deleteHoldingsModal.has({ message: including(modalMessage) }),
      Object.values(deleteHoldingsButtons).map((button) => button().has({ visible: true, disabled: false })),
    ]);

    if (holdingsToDelete.length > 0) {
      holdingsToDelete.forEach((locationName) => {
        cy.expect(deleteHoldingsModal.find(HTML({ text: including(locationName) })).exists());
      });
    }

    cy.do(deleteHoldingsButtons[action]().click());
    cy.expect(deleteHoldingsModal.absent());
  },
};
