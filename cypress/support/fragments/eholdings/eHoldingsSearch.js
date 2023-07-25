import { Button } from '../../../../interactors';


export default {
  switchToTitles: () => {
    cy.intercept('/tags?**').as('getTags');
    cy.do(Button({ id: 'titles-tab' }).click());
    cy.wait('@getTags');
  },
  switchToPackages: () => {
    cy.do(Button({ id: 'packages-tab' }).click());
  }
};
