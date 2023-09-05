import { HTML, including } from '@interactors/html';
import { Button, Pane, Callout } from '../../../../../interactors';

const viewPane = Pane({ id:'view-job-profile-pane' });
const resultsPane = Pane({ id:'pane-results' });
const actionsButton = Button('Actions');

function waitLoading() {
  // wait for the page to be fully loaded
  cy.wait(1500);
}

export default {
  waitLoading,
  edit:() => {
    waitLoading();
    cy.do(viewPane.find(actionsButton).click());
    cy.do(Button('Edit').click());
  },

  verifyJobProfileOpened:() => {
    cy.expect(resultsPane.exists());
    cy.expect(viewPane.exists());
  },
  verifyCalloutMessage:(message) => {
    cy.expect(Callout({ textContent: including(message) }).exists());
    cy.do(Callout().find(Button({ icon:'times' })).click());
  },
  verifyJobProfileName:(profileName) => cy.expect(viewPane.find(HTML(including(profileName))).exists()),
  verifyActionMenuAbsent:() => cy.expect(viewPane.find(actionsButton).absent()),
  getLinkedProfiles:() => {
    waitLoading();
    const profileNames = [];

    return cy.get('[data-test-profile-link]').each($element => {
      cy.wrap($element)
        .invoke('text')
        .then(name => {
          profileNames.push(name);
        });
    }).then(() => {
      return profileNames;
    });
  },

  verifyLinkedProfiles(arrayOfProfileNames, numberOfProfiles) {
    waitLoading();
    const profileNames = [];

    cy.get('[data-test-profile-link]').each($element => {
      cy.wrap($element)
        .invoke('text')
        .then(name => {
          profileNames.push(name);
        });
    }).then(() => {
      // Iterate through each element in profileNames
      for (let i = 0; i < profileNames.length; i++) {
        expect(profileNames[i]).to.include(arrayOfProfileNames[i]);
      }
      expect(numberOfProfiles).to.equal(profileNames.length);
    });
  }
};
