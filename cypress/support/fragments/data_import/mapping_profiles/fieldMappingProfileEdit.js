/* eslint-disable cypress/no-unnecessary-waiting */
import { including } from '@interactors/html';
import { Button, Form, TextField } from '../../../../../interactors';

export default {
  markFieldForProtection:(field) => {
    cy.get('div[class^="mclRow--"]').contains('div[class^="mclCell-"]', field).then(elem => {
      elem.parent()[0].querySelector('input[type="checkbox"]').click();
    });
  },

  save:() => cy.do(Button('Save as profile & Close').click()),

  verifyScreenName:(profileName) => {
    cy.expect(Form(including(`Edit ${profileName}`)).exists());
  },

  fillInstanceStatusTerm:(status) => {
    cy.do(TextField('Instance status term').fillIn(status));
    // wait will be add uuid for acceptedValues
    cy.wait(500);
  },
};
