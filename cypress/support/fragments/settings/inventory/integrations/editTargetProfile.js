import { Button, TextField, Pane } from '../../../../../../interactors';

export default {
  verifyTargetProfileFormOpened: (name) => cy.expect(Pane(name).exists()),
  fillName: (name) => {
    cy.wait(1500);
    cy.do(TextField('Name*').fillIn(name));
  },
  save: (name) => cy.do(Pane(name).find(Button('Save & close')).click()),
};
