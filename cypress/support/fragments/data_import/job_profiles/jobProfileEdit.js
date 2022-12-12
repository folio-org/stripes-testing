import { including } from '@interactors/html';
import { Button, Form, TextField } from '../../../../../interactors';

const saveAndCloseButton = Button('Save as profile & Close');

export default {
  verifyScreenName:(profileName) => cy.expect(Form(including(`Edit ${profileName}`)).exists()),
  changeProfileName:(profileName) => cy.do(TextField({ name:'profile.name' }).fillIn(profileName)),
  saveAndClose: () => {
    cy.do(saveAndCloseButton.click());
    cy.expect(saveAndCloseButton.absent());
  }
};
