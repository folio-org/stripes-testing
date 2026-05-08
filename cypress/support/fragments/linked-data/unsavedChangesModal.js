import { Button } from '../../../../interactors';

const unsavedChangesModal = '//dialog[@data-testid="modal" and contains(@class, "modal-switch-to-new-record")]';
const modalOverlay = '//div[@data-testid="modal-overlay"]';
const dismissButton = Button({ ariaLabel: 'Close Basic modal' });
const continueWithoutSaveButton = Button({ dataTestID: 'modal-button-cancel' });
const saveButton = Button({ dataTestID: 'modal-button-submit' });

export default {
  waitLoading() {
    cy.xpath(unsavedChangesModal).should('be.visible');
  },

  checkButtonsEnabled() {
    cy.expect([dismissButton.exists(), dismissButton.is({ disabled: false })]);
    cy.expect([continueWithoutSaveButton.exists(), continueWithoutSaveButton.is({ disabled: false })]);
    cy.expect([saveButton.exists(), saveButton.is({ disabled: false })]);
  },

  clickDismiss() {
    cy.do(dismissButton.click());
    cy.wait(1000);
  },

  clickContinueWithoutSaving() {
    cy.do(continueWithoutSaveButton.click());
    cy.wait(1000);
  },

  clickSaveAndContinue() {
    cy.do(saveButton.click());
    cy.wait(1000);
  },

  clickOverlayToDismiss() {
    // eslint-disable-next-line cypress/no-force
    cy.xpath(modalOverlay)
      .should('be.visible')
      .click('topLeft', { force: true });
    cy.wait(1000);
  },
};
