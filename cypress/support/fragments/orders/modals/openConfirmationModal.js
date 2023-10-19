import { Button, Modal, including, matching } from '../../../../../interactors';
import OrderStates from '../orderStates';
import InteractorsTools from '../../../utils/interactorsTools';

const openConfirmationModal = Modal(including('Open - purchase order'));
const closeButton = openConfirmationModal.find(Button('Close'));
const submitButton = openConfirmationModal.find(Button('Submit'));

export default {
  verifyModalView({ orderNumber }) {
    cy.expect([
      openConfirmationModal.has({
        header: including(`Open - purchase order - ${orderNumber}`),
      }),
      openConfirmationModal.has({ message: 'Are you sure you want to open the order?' }),
      closeButton.has({ disabled: false, visible: true }),
      submitButton.has({ disabled: false, visible: true }),
    ]);
  },
  closeModal() {
    cy.do(closeButton.click());
    cy.expect(openConfirmationModal.absent());
  },
  confirm() {
    cy.do(submitButton.click());
    cy.expect(openConfirmationModal.absent());

    InteractorsTools.checkCalloutMessage(matching(new RegExp(OrderStates.orderOpenedSuccessfully)));
  },
};
