import { Button, Modal, including } from '../../../../../interactors';
import { DELETE_HOLDINGS_ACTIONS } from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import OrderStates from '../orderStates';

const deleteHoldingsModal = Modal('Delete Holdings');
const cancelButton = deleteHoldingsModal.find(Button(DELETE_HOLDINGS_ACTIONS.CANCEL));
const keepHoldingsButton = deleteHoldingsModal.find(Button(DELETE_HOLDINGS_ACTIONS.KEEP_HOLDINGS));
const deleteHoldingsButton = deleteHoldingsModal.find(
  Button(DELETE_HOLDINGS_ACTIONS.DELETE_HOLDINGS),
);

const content =
  'This PO Line is connected to records in inventory. After this edit there will be no other purchase order lines, pieces OR items connected to the related Holdings record(s). After making this change would you like FOLIO to delete the Holdings record(s)?';

export default {
  verifyModalView() {
    cy.expect([
      deleteHoldingsModal.has({ message: including(content) }),
      cancelButton.has({ disabled: false, visible: true }),
      keepHoldingsButton.has({ disabled: false, visible: true }),
      deleteHoldingsButton.has({ disabled: false, visible: true }),
    ]);
  },
  clickKeepHoldingsButton() {
    cy.do(keepHoldingsButton.click());
    cy.expect(deleteHoldingsModal.absent());

    InteractorsTools.checkCalloutMessage(OrderStates.orderInstanceConnectionUpdatedSuccessfully);
  },
  clickDeleteHoldingsButton() {
    cy.do(deleteHoldingsButton.click());
    cy.expect(deleteHoldingsModal.absent());

    InteractorsTools.checkCalloutMessage(OrderStates.orderInstanceConnectionUpdatedSuccessfully);
  },
};
