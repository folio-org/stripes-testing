import { Button } from '../../../interactors';

const profile = Button({ ariaLabel: 'My profile' });
const times = Button({ icon: 'times' });

export default {
  servicePointsOne() {
    cy.do(profile.click());
    cy.do(Button({ id: 'service-points-clickable-menuItem0' }).click());
    cy.do(Button({ id: 'service-point-btn-3' }).click());
  },

  servicePointsTwo() {
    cy.do(profile.click());
    cy.do(Button({ id: 'service-points-clickable-menuItem0' }).click());
    cy.do(Button({ id: 'service-point-btn-5' }).click());
  },

  clickApplyMainFilter() {
    cy.get('[class^="Button-"][type="submit"]').first().click();
  },

  clickClose: () => {
    cy.do([times.click()]);
  },
};
