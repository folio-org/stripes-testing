import { Button, Modal } from '../../../../interactors';

const rootModal = Modal({ id: 'warning-modal' });

const confirmButton = Button({ id: 'warningTransferContinue' });

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },
  uncheckDeselectToContinue: () => {
    cy.get('#warning-mcl')
      .find('[data-row-index="row-0"]')
      .find('[class*="mclCell-"]:first-child')
      .click();
  },
  isConfirmActive: (isActive) => cy.expect(confirmButton.has({ disabled: !isActive })),
  confirm: () => cy.do(confirmButton.click()),
  cancel: () => cy.do(Button({ id: 'warningTransferCancel' }).click()),
};
