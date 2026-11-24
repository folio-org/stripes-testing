import { HTML, Link, NavListItem, NavItemList, Button } from '../../../interactors';
import { AppList } from '../../../interactors/applist';

export default {
  // opens the app from the app list, or from the apps dropdown when it's not shown in the list
  openApp(appName, subSection) {
    cy.get('body').then(($body) => {
      if ($body.find(`[data-test-app-list] a:contains("${appName}"):visible`).length) {
        this.navigateToApp(appName, subSection);
      } else {
        this.openAppFromDropdown(appName, subSection);
      }
    });
  },
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
};
