import { Button, Modal, including, matching } from '../../../../../interactors';
import OrderStates from '../orderStates';
import InteractorsTools from '../../../utils/interactorsTools';

const cancelConfirmationModal = Modal({ id: 'cancel-line-confirmation' });
const cancelButton = cancelConfirmationModal.find(Button('Cancel'));
const cancelOrderLineButton = cancelConfirmationModal.find(Button('Cancel order line'));

export default {
  verifyModalView({ orderLineNumber }) {
    cy.expect([
      cancelConfirmationModal.has({
        header: including(`Cancel ${orderLineNumber}?`),
      }),
      cancelButton.has({ disabled: false, visible: true }),
      cancelOrderLineButton.has({ disabled: false, visible: true }),
    ]);
  },
  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(cancelConfirmationModal.absent());
  },
  clickCancelOrderLineButton() {
    cy.do(cancelOrderLineButton.click());
    cy.expect(cancelConfirmationModal.absent());

    InteractorsTools.checkCalloutMessage(
      matching(new RegExp(OrderStates.orderLineCanceledSuccessfully)),
    );
  },
};
