import { Button, HTML, Pane, Section, including } from '../../../../interactors';
import eHoldingsPackages from './eHoldingsPackages';

export default {
  close:() => {
    cy.do(Button({ icon: 'times' }).click());
    eHoldingsPackages.waitLoading();
  },

  waitLoading() {
    cy.expect([
      Section({ id: 'packageShowInformation' }).exists(),
      Button('Actions').exists()
    ]);
  },

  verifyPackageName(packageName) {
    cy.expect([
      Pane({ title: packageName }).exists(),
      HTML(packageName, { className: including('headline') }).exists()
    ]);
  }
};
