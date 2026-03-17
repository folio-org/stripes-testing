import { HTML, including } from '@interactors/html';
import { Button } from '../../../../interactors';

const cancelButton = Button('Cancel');
const continueButton = Button('Continue');
const closeButton = Button({ ariaLabel: 'Close hub import preview page' });

export default {
  waitLoading() {
    cy.expect(HTML(including('Import hub -')).exists({ timeout: 15000 }));
    cy.expect(continueButton.exists());
    cy.expect(cancelButton.exists());
  },

  verifyPageTitle(hubName) {
    cy.expect(HTML(including(`Import hub - ${hubName}`)).exists());
  },

  verifyButtons() {
    cy.expect(closeButton.exists());
    cy.expect(cancelButton.exists());
    cy.expect(continueButton.exists());
    cy.expect(closeButton.has({ disabled: false }));
    cy.expect(cancelButton.has({ disabled: false }));
    cy.expect(continueButton.has({ disabled: false }));
  },

  verifySectionsPresent() {
    cy.expect(HTML(including('Creator of Hub')).exists());
    cy.expect(HTML(including('Title Information')).exists());
    cy.expect(HTML(including('Language code')).exists());
  },

  verifyMainTitle(expectedTitle) {
    cy.expect(HTML(including('Main Title')).exists());
    cy.get('strong.value-heading')
      .contains('Main Title')
      .parent()
      .find('div')
      .should('have.text', expectedTitle);
  },

  verifyVariantTitle(expectedTitle) {
    cy.expect(HTML(including('Variant Title')).exists());
    cy.get('strong.value-heading')
      .contains('Variant Title')
      .first()
      .parent()
      .find('div')
      .first()
      .should('have.text', expectedTitle);
  },

  verifyTitleInformation({ mainTitle, variantTitles = [] } = {}) {
    if (mainTitle) {
      this.verifyMainTitle(mainTitle);
    }
    variantTitles.forEach((title) => {
      cy.expect(HTML(including(title)).exists());
    });
  },

  clickContinue() {
    cy.do(continueButton.click());
  },

  clickCancel() {
    cy.do(cancelButton.click());
    cy.wait(1000);
  },

  clickClose() {
    cy.do(closeButton.click());
    cy.wait(1000);
  },
};
