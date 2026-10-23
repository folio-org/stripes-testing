import { Pane, PaneContent, NavListItem } from '../../../../../interactors';

export default {
  waitLoading() {
    cy.expect(Pane('My profile').exists());
  },

  openChangePassword() {
    cy.do(
      PaneContent({ id: 'app-settings-nav-pane-content' })
        .find(NavListItem('Change password'))
        .click(),
    );
  },
  verifyLanguageAndLocalizationIsLastTab() {
    cy.get('#app-settings-nav-pane-content [class^=NavListItem]')
      .last()
      .should('contain.text', 'Language & localization');
  },
  openLanguageAndLocalization() {
    cy.do(
      PaneContent({ id: 'app-settings-nav-pane-content' })
        .find(NavListItem('Language & localization'))
        .click(),
    );
  },
};
