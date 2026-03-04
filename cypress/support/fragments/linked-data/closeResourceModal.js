const closeResourceModal =
  "//div[@data-testid='modal']//h3[@class='title' and text()='Close resource']";
const closeResourceModalByTestId = "//div[@data-testid='modal']";
const modalContent = "//div[@data-testid='modal-close-record-content']";
const closeButton = "//button[@class='close-button']";
const yesButton = "//button[@data-testid='modal-button-cancel']";
const noButton = "//button[@data-testid='modal-button-submit']";

export default {
  verifyModalDisplayed() {
    cy.xpath(closeResourceModal).should('be.visible');
    cy.xpath(modalContent).should('be.visible');
    cy.xpath(modalContent).should(
      'contain.text',
      'Do you really want to close the resource description?',
    );
    cy.xpath(modalContent).should('contain.text', 'All unsaved changes will be lost.');
  },

  verifyButtons() {
    cy.xpath(yesButton).should('be.visible');
    cy.xpath(noButton).should('be.visible');
    cy.xpath(closeButton).should('be.visible');
  },

  clickCloseButton() {
    cy.xpath(closeButton).should('be.visible');
    cy.xpath(closeButton).click();
  },

  verifyModalClosed() {
    cy.xpath(closeResourceModalByTestId).should('not.exist');
  },

  clickNoButton() {
    cy.xpath(noButton).click();
  },

  clickYesButton() {
    cy.xpath(yesButton).click();
  },
};
