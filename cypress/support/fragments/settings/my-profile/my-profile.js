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
};
