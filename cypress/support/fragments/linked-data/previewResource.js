import editResource from './editResource';

const continueButton = "//button[@data-testid='continue-external-preview-button']";
const cancelButton = "//button[@data-testid='close-external-preview-button']";

export default {
  waitLoading() {
    cy.xpath("//div[@class='preview-panel preview-panel-row']").should('be.visible');
    cy.xpath(continueButton).should('be.visible');
    cy.xpath(cancelButton).should('be.visible');
  },

  clickContinue() {
    cy.xpath(continueButton).click();
    editResource.waitLoading();
  },
};
