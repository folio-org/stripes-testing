import { Button, Modal } from '../../../interactors';

const closeButton = Button('Close');

export default {
  closeModalIfAny() {
    cy.wait(10000);
    cy.get('body').then(($body) => {
      if ($body.find('[class^=modal---]').length > 0) {
        cy.do(Modal().find(closeButton).click());
        cy.wait(1000);
      } else {
        cy.log("Modal didn't appear");
      }
    });
  },
};
