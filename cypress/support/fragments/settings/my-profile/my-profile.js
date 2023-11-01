import { Pane, Dropdown, Button } from '../../../../../interactors';

export default {
  waitLoading() {
    cy.expect(Pane('My profile').exists());
  },

  openChangePassword() {
    cy.do(Dropdown('My profile').find(Button('Change Password')).click());
  },
};
