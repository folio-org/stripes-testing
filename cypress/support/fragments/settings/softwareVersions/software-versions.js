import { Pane, HTML, MessageBanner, including } from '../../../../../interactors';

export const SETTINGS_SUBSECTION_ABOUT = 'Software versions';
const aboutPane = Pane(SETTINGS_SUBSECTION_ABOUT);

export default {
  waitLoading() {
    cy.xpath('//span[@id="platform-versions"]').should('exist');
  },

  checkErrorNotDisplayed() {
    cy.get('[role="alert"]').should('not.be.visible');
  },

  checkErrorText(missingModuleIds) {
    let errorHeadline = `${missingModuleIds.length} missing interface`;
    if (missingModuleIds.length > 1) errorHeadline += 's';
    const errorBlock = aboutPane.find(MessageBanner({ headline: errorHeadline }));
    cy.expect(errorBlock.exists());
    for (const moduleId of missingModuleIds) {
      cy.expect(errorBlock.has({ textContent: including(moduleId) }));
    }
  },

  verifyTextPresent(text) {
    cy.expect(aboutPane.find(HTML({ text })).exists());
  },
};
