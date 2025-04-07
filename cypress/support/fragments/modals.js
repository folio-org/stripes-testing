import { Button, Modal, Checkbox } from '../../../interactors';

const closeButton = Button('Close');

export default {
  closeModalIfAny() {
    cy.wait(5000);
    cy.get('body').then(($body) => {
      if ($body.find('[class^=modal---]').length > 0) {
        cy.do(Modal().find(closeButton).click());
        cy.wait(1000);
      } else {
        cy.log("Modal didn't appear");
      }
    });
  },

  closeModalWithPrintSlipCheckboxIfAny() {
    cy.wait(5000);
    cy.get('body').then(($body) => {
      if ($body.find('[class^=modal---]').length > 0) {
        if ($body.find('[class^=modal---] [name="printSlip"]').length > 0) {
          cy.do(Modal().find(Checkbox('Print slip')).click());
          cy.wait(500);
        }
        cy.do(Modal().find(closeButton).click());
        cy.wait(1000);
      } else {
        cy.log("Modal didn't appear");
      }
    });
  },
};
