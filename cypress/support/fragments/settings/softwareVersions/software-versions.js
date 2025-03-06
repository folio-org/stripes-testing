import { Pane, HTML, MessageBanner, including } from '../../../../../interactors';

export const SETTINGS_SUBSECTION_ABOUT = 'Software versions';
const aboutPane = Pane(SETTINGS_SUBSECTION_ABOUT);

export default {
  waitLoading() {
    cy.xpath('//span[@id="platform-versions"]').should('exist');
  },

  selectSoftwareVersions() {
    cy.xpath('//a[@href="/settings/about"]').click();
  },

  checkErrorNotDisplayed() {
    cy.get('[role="alert"]').should('not.be.visible');
  },

  checkErrorText(missingModuleIds) {
    let errorHeadline = `${missingModuleIds.length} missing interface`;
    const errorBlock = aboutPane.find(MessageBanner({ headline: errorHeadline }));
    if (missingModuleIds.length) {
      if (missingModuleIds.length > 1) errorHeadline += 's';
      cy.expect(errorBlock.exists());
      for (const moduleId of missingModuleIds) {
        cy.expect(errorBlock.has({ textContent: including(moduleId) }));
      }
    } else this.checkErrorNotDisplayed();
  },

  verifyTextPresent(text) {
    cy.expect(aboutPane.find(HTML({ text })).exists());
  },
};
