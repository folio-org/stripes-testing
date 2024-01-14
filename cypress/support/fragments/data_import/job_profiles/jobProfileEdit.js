import { including } from '@interactors/html';
import { Button, Form, Modal, TextField } from '../../../../../interactors';

const saveAndCloseButton = Button('Save as profile & Close');

export default {
  verifyScreenName: (profileName) => cy.expect(Form(including(`Edit ${profileName}`)).exists()),
  changeProfileName: (profileName) =>
    cy.do(TextField({ name: 'profile.name' }).fillIn(profileName)),
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
  unlinkActionsProfile: (number) => {
    cy.get('[id*="branch-ROOT-editable"]').eq(number).find('button[icon="unlink"]').click();
    cy.do(Modal({ id: 'unlink-job-profile-modal' }).find(Button('Unlink')).click());
  },
  unlinkMatchProfile: (number) => {
    cy.get('[id*="branch-ROOT-MATCH-editable"]').eq(number).find('button[icon="unlink"]').click();
    cy.do(Modal({ id: 'unlink-job-profile-modal' }).find(Button('Unlink')).click());
  },
  unlinkNonMatchProfile: (number) => {
    cy.get('[id*="branch-ROOT-NON_MATCH-editable"]')
      .eq(number)
      .find('button[icon="unlink"]')
      .click();
    cy.do(Modal({ id: 'unlink-job-profile-modal' }).find(Button('Unlink')).click());
  },
  verifyLinkedProfiles(arrayOfProfileNames, numberOfProfiles) {
    const profileNames = [];

    cy.get('[id*="branch-ROOT-editable"]')
      .each(($element) => {
        cy.wrap($element)
          .invoke('text')
          .then((name) => {
            profileNames.push(name);
          });
      })
      .then(() => {
        // Iterate through each element in profileNames
        for (let i = 0; i < profileNames.length; i++) {
          expect(profileNames[i]).to.include(arrayOfProfileNames[i]);
        }
        expect(numberOfProfiles).to.equal(profileNames.length);
      });
  },
};
