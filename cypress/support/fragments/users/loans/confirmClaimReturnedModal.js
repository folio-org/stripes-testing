import { Button, Modal, TextArea, including, HTML } from '../../../../../interactors';
import { getTestEntityValue } from '../../../utils/stringTools';

const additionalInformation = getTestEntityValue('autoTestClaimedReturned');
const confirmModal = Modal(including('Confirm claim returned'));
const cancelButton = confirmModal.find(Button('Cancel'));
const confirmButton = confirmModal.find(Button('Confirm'));
const additionalInformationField = confirmModal.find(TextArea('Additional information*'));

const confirmModalInLoanDetails = Modal(including('Confirm item status: Claimed returned'));
const additionalInformationInLoanDetails = confirmModalInLoanDetails.find(
  TextArea('Additional information*'),
);
const confirmButtonInLoanDetails = confirmModalInLoanDetails.find(Button('Confirm'));

export default {
  confirmItemStatus: (reasonToChangeStatus = additionalInformation) => {
    return cy.do([
      additionalInformationField.fillIn(reasonToChangeStatus),
      confirmButton.click(),
      confirmModal.dismiss(),
    ]);
  },
  confirmClaimReturnedInLoanDetails: (reasonToChangeStatus = additionalInformation) => {
    return cy.do([
      additionalInformationInLoanDetails.fillIn(reasonToChangeStatus),
      confirmButtonInLoanDetails.click(),
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
