import { Button } from '../../../../interactors';

const continueButton = Button('Continue');
const cancelButton = Button('Cancel');

export default {
  waitLoading() {
    cy.xpath("//div[@class='preview-panel preview-panel-row']").should('be.visible');
    cy.expect(continueButton.exists());
    cy.expect(cancelButton.exists());
    cy.wait(2000);
  },

  clickContinue(retries = 2) {
    cy.intercept('POST', '**/linked-data/inventory-instance/**/import').as('importRequest');
    cy.do(continueButton.click());
    cy.wait('@importRequest').then((interception) => {
      if (interception.response.statusCode === 400 && retries > 0) {
        cy.wait(3000);
        this.clickContinue(retries - 1);
      }
    });
  },
};
