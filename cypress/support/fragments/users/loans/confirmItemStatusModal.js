import { Button, Modal, TextArea, including } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const additionalInformation = `Reason why the item status changed [${getRandomPostfix()}]`;
const confirmModal = Modal(including('Confirm item status'));
const cancelButton = confirmModal.find(Button('Cancel'));
const confirmButton = confirmModal.find(Button('Confirm'));
const additionalInformationField = confirmModal.find(TextArea('Additional information*'));

export default {
  confirmItemStatus(reasonToChangeStatus = additionalInformation) {
    return cy.do([additionalInformationField.fillIn(reasonToChangeStatus), confirmButton.click()]);
  },
  verifyModalView({ action, item = '' } = {}) {
    cy.expect([
      confirmModal.has({ header: including(`Confirm item status: ${action}`) }),
      confirmModal.has({ message: including(item) }),
      additionalInformationField.exists(),
      confirmButton.has({ disabled: true, visible: true }),
      cancelButton.has({ disabled: false, visible: true }),
    ]);
  },
  closeModal() {
    return cy.do(cancelButton.click());
  },
};
