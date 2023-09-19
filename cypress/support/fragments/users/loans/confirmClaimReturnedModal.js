import { Button, Modal, TextArea, including, HTML } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const additionalInformation = `autoTestText_${getRandomPostfix()}`;
const confirmModal = Modal(including('Confirm claim returned'));
const cancelButton = confirmModal.find(Button('Cancel'));
const confirmButton = confirmModal.find(Button('Confirm'));
const additionalInformationField = confirmModal.find(TextArea('Additional information*'));

export default {
  confirmItemStatus: (reasonToChangeStatus = additionalInformation) => {
    return cy.do([
      additionalInformationField.fillIn(reasonToChangeStatus),
      confirmButton.click(),
      confirmModal.dismiss(),
    ]);
  },
  verifyModalView: () => {
    cy.do(additionalInformationField.exists());
    cy.expect([confirmButton.has({ disabled: true, visible: true }), confirmModal.exists()]);
  },
  closeModal: () => {
    return cy.do(cancelButton.click());
  },
  verifyNumberOfItemsToBeClaimReturned: (quantityOfItemsToBeClaimReturned) => {
    return cy.expect(
      confirmModal
        .find(
          HTML(including(`${quantityOfItemsToBeClaimReturned} item(s) will be claimed returned.`)),
        )
        .exists(),
    );
  },
};
