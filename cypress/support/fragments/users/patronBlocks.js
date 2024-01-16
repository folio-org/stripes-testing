import { Button, Modal, PaneHeader } from '../../../../interactors';

const newBlockHeader = PaneHeader({ id: 'paneHeadertitle-patron-block' });
const cancelButton = Button('Cancel');
const saveButton = Button({ id: 'patron-block-save-close' });

export default {
  waitLoading() {
    cy.expect(newBlockHeader.exists());
  },

  verifyCancelButtonDisabled(status = true) {
    cy.expect(cancelButton.is({ disabled: status }));
  },

  verifySaveButtonDisabled(status = true) {
    cy.expect(saveButton.is({ disabled: status }));
  },

  deletePatronBlock(block) {
    cy.do(Button({ id: 'patron-block-delete' }).click());
    cy.expect(
      Modal('Delete patron block?').has({
        message: `${block} patron block will be removed`,
      }),
    );
    cy.do(Button({ id: 'clickable-patron-block-confirmation-modal-confirm' }).click());
  },
};
