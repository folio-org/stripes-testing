import { Button } from '../../../../interactors';

export default {
  switchToTitles: () => {
    cy.do(Button({ id: 'titles-tab' }).click());
  },
  switchToPackages: () => {
    cy.do(Button({ id: 'packages-tab' }).click());
  },
};
