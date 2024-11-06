import { Heading, NavListItem, Pane } from '../../../../../../interactors';

export default {
  waitLoading() {
    cy.expect(Heading('Staff slips').exists());
    cy.wait(1000);
  },
  chooseStaffClip(name) {
    cy.do(NavListItem(name).click());
    cy.expect(Pane(name).exists());
  },
};
