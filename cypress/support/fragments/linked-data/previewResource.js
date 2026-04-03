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

  clickContinue() {
    cy.do(continueButton.click());
    cy.wait(4000);
  },
};
