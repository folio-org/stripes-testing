import { HTML, Link, NavListItem, NavItemList, Button } from '../../../interactors';
import { AppList } from '../../../interactors/applist';

export default {
  navigateToApp(appName, subSection) {
    return cy.wrap(true).then(() => {
      cy.wait(2000);
      cy.do(AppList().choose(appName));
      cy.wait(2000);

      if (subSection) {
        cy.do(NavListItem(subSection).click());
        cy.wait(2000);
      }
      cy.wait(3000);
    });
  },
  isAbsent() {
    cy.expect(AppList().absent());
  },
  openAppFromDropdown(appName, subSection) {
    cy.wait(2000);
    cy.do(HTML({ id: 'app-list-dropdown-toggle' }).click());
    cy.wait(2000);
    cy.do(AppList().find(Link(appName)).click());
    if (subSection) {
      cy.do(NavListItem(subSection).click());
      cy.wait(2000);
    }
  },
  clickToGoHomeButton() {
    cy.do(Button({ id: 'ModuleMainHeading' }).click());
  },
  verifyNavigationItemAbsentOnTheBar(appName) {
    cy.expect(NavItemList({ label: appName }).absent());
  },
  verifyAppButtonShown(appName, isShown = true) {
    if (isShown) cy.expect(AppList().find(Link(appName)).exists());
    else cy.expect(AppList().find(Link(appName)).absent());
  },
  navigateToAppAdaptive(appName) {
    cy.wait(2000);
    cy.then(() => {
      cy.get('body').then(($body) => {
        if ($body.find(`[data-test-app-link="${appName}"]`).length > 0) {
          cy.do(AppList().choose(appName));
        } else {
          cy.do(HTML({ id: 'app-list-dropdown-toggle' }).click());
          cy.wait(2000);
          cy.do(AppList().find(Link(appName)).click());
        }
      });
    });
    cy.wait(2000);
  },
};
