import { HTML, Link, NavListItem, Button } from '../../../interactors';
import { AppList } from '../../../interactors/applist';

export default {
  navigateToApp(appName, subSection) {
    return cy.wrap(true).then(() => {
      cy.wait(2000);
      cy.do(AppList().choose(appName));
      cy.wait(1000);

      if (subSection) {
        cy.do(NavListItem(subSection).click());
        cy.wait(1000);
      }
    });
  },
  isAbsent() {
    cy.expect(AppList().absent());
  },
  openAppFromDropdown(appName) {
    cy.do(HTML({ id: 'app-list-dropdown-toggle' }).click());
    cy.wait(2000);
    cy.do(Link(appName).click());
  },
  clickToGoHomeButton() {
    cy.do(Button({ id: 'ModuleMainHeading' }).click());
  },
};
