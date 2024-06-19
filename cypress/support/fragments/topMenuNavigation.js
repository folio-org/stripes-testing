import { HTML, Link, NavListItem } from '../../../interactors';
import { AppList } from '../../../interactors/applist';

export default {
  navigateToApp(appName, subSection) {
    cy.wait(2000);
    cy.do(AppList().choose(appName));

    if (subSection) {
      cy.do(NavListItem(subSection).click());
    }
  },
  isAbsent() {
    cy.expect(AppList().absent());
  },
  openAppFromDropdown(appName) {
    cy.do(HTML({ id: 'app-list-dropdown-toggle' }).click());
    cy.wait(500);
    cy.do(Link(appName).click());
  },
};
