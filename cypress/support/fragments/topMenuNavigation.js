import { AppList } from "../../../interactors/applist";

export default {
  navigateToApp(appName) {
    cy.do(AppList().choose(appName));
  },
}