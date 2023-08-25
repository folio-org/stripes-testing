import { HTML, including } from '@interactors/html';
import { Button, Pane } from '../../../../../interactors';

const viewPane = Pane({ id:'view-job-profile-pane' });
const resultsPane = Pane({ id:'pane-results' });
const actionsButton = Button('Actions');

export default {
  edit:() => {
    cy.do(viewPane.find(actionsButton).click());
    cy.do(Button('Edit').click());
  },

  duplicate:() => {
    cy.do(viewPane.find(actionsButton).click());
    cy.do(Button('Duplicate').click());
  },

  verifyJobProfileOpened:() => {
    cy.expect(resultsPane.exists());
    cy.expect(viewPane.exists());
  },

  verifyJobProfileName:(profileName) => cy.expect(viewPane.find(HTML(including(profileName))).exists()),
  verifyActionMenuAbsent:() => cy.expect(viewPane.find(actionsButton).absent())
};
