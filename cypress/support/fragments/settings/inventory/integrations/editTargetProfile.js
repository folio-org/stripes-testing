import { Button, TextField, Pane } from '../../../../../../interactors';

export default {
  fillName: (name) => {
    cy.wait(1500);
    cy.do(TextField('Name*').fillIn(name));
  },
  fillAuthentication: (auth) => {
    cy.wait(1500);
    cy.do(TextField({ name: 'authentication' }).fillIn(auth));
  },
  save: (name) => cy.do(Pane(name).find(Button('Save & close')).click()),

  verifyTargetProfileFormOpened: (name) => cy.expect(Pane(name).exists()),
};
