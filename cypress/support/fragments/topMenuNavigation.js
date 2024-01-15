import { NavListItem } from '../../../interactors';
import { AppList } from '../../../interactors/applist';

export default {
  navigateToApp(appName, subSection) {
    cy.do(AppList().choose(appName));

    if (subSection) {
      cy.do(NavListItem(subSection).click());
    }
  },
  isAbsent() {
    cy.expect(AppList().absent());
  },
};
