import { Button, HTML, Modal, including } from '../../../../../interactors';

const modalTitle = 'Confirm in-house use';
const confirmModal = Modal(modalTitle);
const cancelButton = confirmModal.find(Button('Cancel'));
const checkInOnlyButton = confirmModal.find(Button('Check in only'));
const checkInAndInHouseUseButton = confirmModal.find(Button('Check in and in-house use'));
const closeIconButton = confirmModal.find(Button({ icon: 'times' }));

export default {
  verifyModalContent() {
    cy.expect([
      confirmModal.exists(),
      confirmModal
        .find(
          HTML(
            including(
              'This item is currently checked out. Do you want to check in only or check in and register an in-house use?',
            ),
          ),
        )
        .exists(),
      cancelButton.is({ disabled: false }),
      checkInOnlyButton.is({ disabled: false }),
      checkInAndInHouseUseButton.is({ disabled: false }),
    ]);
  },

  verifyModalExists() {
    cy.expect(confirmModal.exists());
  },

  verifyModalAbsent() {
    cy.expect(confirmModal.absent());
  },

  clickCancel() {
    cy.do(cancelButton.click());
  },

  clickCheckInOnly() {
    cy.do(checkInOnlyButton.click());
  },

  clickCheckInAndInHouseUse() {
    cy.do(checkInAndInHouseUseButton.click());
  },

  clickCloseIcon() {
    cy.do(closeIconButton.click());
  },
};
