import { Button, Modal, including } from '../../../../../interactors';
import { RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES } from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';

const removeFromPackageModal = Modal('Remove from package');
const cancelButton = removeFromPackageModal.find(Button('Cancel'));
const confirmButton = removeFromPackageModal.find(Button('Confirm'));

export default {
  verifyModalView() {
    cy.expect([
      removeFromPackageModal.has({
        message: including(RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES.CONFIRMATION),
      }),
      cancelButton.has({ disabled: false, visible: true }),
      confirmButton.has({ disabled: false, visible: true }),
    ]);
  },

  clickCancelButton() {
    cy.do(cancelButton.click());
    cy.expect(removeFromPackageModal.absent());
  },

  // titleRemoved = false when "Delete Holdings" modal or an error toast is expected after confirm
  clickConfirmButton({ titleRemoved = true } = {}) {
    cy.do(confirmButton.click());
    cy.expect(removeFromPackageModal.absent());

    if (titleRemoved) {
      InteractorsTools.checkCalloutMessage(RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES.SUCCESS);
    }
  },
};
