import { Pane, HTML, MessageBanner, including } from '../../../../../interactors';

export const SETTINGS_SUBSECTION_ABOUT = 'Software versions';
const aboutPane = Pane(SETTINGS_SUBSECTION_ABOUT);

export default {
  waitLoading() {
    cy.xpath('//span[@id="platform-versions"]').should('exist');
  },

  selectSoftwareVersions() {
    cy.xpath('//a[@href="/settings/about"]').should('be.visible');
    // break the chain to avoid error on jenkins
    cy.wait(1000);
    cy.xpath('//a[@href="/settings/about"]').click();
    // added waiter to fix failures on jenkins with 'something went wrong'
    cy.wait(1000);
  },

  checkErrorNotDisplayed() {
    cy.get('[role="alert"]').should('not.be.visible');
  },

  logSoftwareVersion() {
    // since there's no unique selector - log first element which corresponds software version
    // if no sofware version displayed it will log next first headline
    cy.xpath("((//div[contains(@class,'paneContent')])[2]//div[@data-test-headline='true'])[1]")
      .invoke('text')
      .then((headerText) => {
        cy.log('Software version header: ' + headerText);
      });
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
