import { Button } from '../../../../interactors';

const previewPanel = '//div[@class="external-resource-preview"]/div[@data-testid="preview-fields"]';
const continueButton = Button({ dataTestID: 'continue-external-preview-button' });
const cancelButton = Button({ dataTestID: 'close-external-preview-button' });

export default {
  waitLoading() {
    cy.xpath(previewPanel).should('be.visible');
    cy.wait(500);
  },

  clickContinueButton() {
    cy.do(continueButton.click());
    cy.wait(500);
  },

  clickClosePreviewButton() {
    cy.do(cancelButton.click());
    cy.wait(500);
  },
};
