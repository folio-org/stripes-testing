import { HTML, including, Button, TextField } from '../../../../interactors';

export default {

  waitLoading:() => {
    cy.expect(HTML(including('New custom package')).exists());
  },

  fillInRequiredProperties: (packageName) => {
    cy.do(TextField('Name*').fillIn(packageName));
  },
  saveAndClose:() => {
    cy.do(Button('Save & close').click());
  }
};
