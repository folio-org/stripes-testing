import { HTML, including } from '@interactors/html';
import { Button } from '../../../../interactors';

const closePreviewButton = Button({ ariaLabel: 'Close resource preview section' });
const editHubButton = Button('Edit hub');

export default {
  waitLoading() {
    cy.expect(editHubButton.exists());
    cy.expect(closePreviewButton.exists());
  },

  verifyButtons() {
    cy.expect(closePreviewButton.exists());
    cy.expect(closePreviewButton.has({ disabled: false }));
    cy.expect(editHubButton.exists());
    cy.expect(editHubButton.has({ disabled: false }));
  },

  verifySectionsPresent() {
    cy.expect(HTML(including('Creator of Hub')).exists());
    cy.expect(HTML(including('Title Information')).exists());
    cy.expect(HTML(including('Language code')).exists());
  },

  verifyHubTitle(expectedTitle) {
    cy.expect(HTML(including(expectedTitle)).exists());
  },

  verifyCreatorOfHub(name) {
    cy.expect(HTML(including(name)).exists());
  },

  verifyLanguage(language) {
    cy.expect(HTML(including(language)).exists());
  },

  clickEditHub() {
    cy.do(editHubButton.click());
  },

  close() {
    cy.do(closePreviewButton.click());
  },
};
