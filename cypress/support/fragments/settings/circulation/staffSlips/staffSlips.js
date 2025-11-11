import { Heading, NavListItem, Pane } from '../../../../../../interactors';

export default {
  waitLoading() {
    cy.expect(Heading('Staff slips').exists());
    cy.wait(1000);
  },
  chooseStaffClip(name) {
    cy.intercept('GET', '/users?query=id*', { statusCode: 200 }).as('getUser');
    cy.do(NavListItem(name).click());
    cy.wait('@getUser');
    cy.expect(Pane(name).exists());
  },
};
