import { Button, Modal, TextArea, including } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const additionalInformation = `autoTestText_${getRandomPostfix()}`;
const confirmModal = Modal(including('Confirm item status'));
const cancelButton = confirmModal.find(Button('Cancel'));
const confirmButton = confirmModal.find(Button('Confirm'));
const additionalInformationField = confirmModal.find(TextArea('Additional information*'));

export default {
  confirmItemStatus:(reasonToChangeStatus = additionalInformation) => {
    return cy.do([
      additionalInformationField.fillIn(reasonToChangeStatus),
      confirmButton.click()
    ]);
  },
  verifyModalView:(titleToCheck) => {
    cy.do(additionalInformationField.exists());
    cy.expect(confirmButton.has({ disabled: true, visible: true }));
    cy.expect(Modal(including(titleToCheck)).exists());
    return cy.do(cancelButton.click());
  }
};
