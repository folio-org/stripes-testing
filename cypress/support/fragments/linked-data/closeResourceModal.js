import { Button } from '../../../../interactors';

const modalSelector = '[data-testid="modal-close-record-content"]';
const yesBtn = Button({ dataTestID: 'modal-button-cancel' });
const noBtn = Button({ dataTestID: 'modal-button-submit' });

export default {
  verifyModalDisplayed() {
    cy.get(modalSelector).should('be.visible');
    cy.get(modalSelector).should(
      'contain.text',
      'Do you really want to close the resource description?',
    );
    cy.get(modalSelector).should('contain.text', 'All unsaved changes will be lost.');
  },

  verifyButtons() {
    cy.get(modalSelector)
      .parents('dialog')
      .first()
      .within(() => {
        cy.get('[data-testid="modal-button-cancel"]').should('be.visible');
        cy.get('[data-testid="modal-button-submit"]').should('be.visible');
      });
  },

  clickCloseButton() {
    cy.get(modalSelector).parents('dialog').first().find('button.close-button')
      .click();
  },

  verifyModalClosed() {
    cy.get(modalSelector).should('not.exist');
  },

  clickNoButton() {
    cy.do(noBtn.click());
    cy.wait(500);
  },

  clickYesButton() {
    cy.do(yesBtn.click());
    cy.wait(500);
  },
};
