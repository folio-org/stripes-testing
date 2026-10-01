import { Button, Modal, HTML, including } from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';

const areYouSureForm = Modal('Are you sure?');
const keepEditingBtn = Button('Keep editing');
const closeWithoutSavingButton = Button('Close without saving');

export default {
  verifyAreYouSureForm(isOpen = false) {
    if (isOpen) {
      cy.expect([
        areYouSureForm.find(HTML(including('There are unsaved changes'))).exists(),
        areYouSureForm.find(keepEditingBtn).exists(),
        areYouSureForm.find(closeWithoutSavingButton).exists(),
      ]);
    } else {
      cy.expect(areYouSureForm.absent());
    }
  },
  clickCloseWithoutSavingButton() {
    cy.do(areYouSureForm.find(closeWithoutSavingButton).click());
  },

  clickKeepEditingButton() {
    cy.do(areYouSureForm.find(keepEditingBtn).click());
  },
  dismissIfOpen() {
    cy.wait(DEFAULT_WAIT_TIME);
    cy.document().then((doc) => {
      if (doc.querySelector('[class^=modal-]')?.textContent.includes('Are you sure?')) {
        this.clickCloseWithoutSavingButton();
      }
    });
  },
};
