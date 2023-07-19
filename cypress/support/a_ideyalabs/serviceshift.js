
import { Button } from '../../../interactors';
import button from '../../../interactors/button';

const profile = button({ ariaLabel:'My profile' });
const times = Button({ icon: 'times' });
export default {
  servicepoints1() {
    cy.do(profile.click());
    cy.do(button({ id: 'service-points-clickable-menuItem0' }).click());
    cy.do(button({ id: 'service-point-btn-3' }).click());
  },
  servicepoints2() {
    cy.do(profile.click());
    cy.do(button({ id: 'service-points-clickable-menuItem0' }).click());
    cy.do(button({ id: 'service-point-btn-5' }).click());
  },
  clickApplyMainFilter() {
    cy.get('[class^="button-"][type="submit"]').first().click();
  },
  clickClose:() => {
    cy.do([times.click()]);
  }


};
