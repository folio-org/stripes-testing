import { including } from '@interactors/html';
import { Button, Form, Modal, TextField } from '../../../../../interactors';

const saveAndCloseButton = Button('Save as profile & Close');

export default {
  verifyScreenName: (profileName) => cy.expect(Form(including(`Edit ${profileName}`)).exists()),
  changeProfileName: (profileName) => cy.do(TextField({ name: 'profile.name' }).fillIn(profileName)),
  saveAndClose: () => {
    cy.do(saveAndCloseButton.click());
    cy.expect(saveAndCloseButton.absent());
  },
  unlinkProfile: (number) => {
    cy.get('[id*="branch-ROOT-MATCH-MATCH-MATCH-editable"]')
      .eq(number)
      .find('button[icon="unlink"]')
      .click();
    cy.do(Modal({ id: 'unlink-job-profile-modal' }).find(Button('Unlink')).click());
  },
};
