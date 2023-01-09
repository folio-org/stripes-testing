import { HTML, including } from '@interactors/html';
import { Button, Pane } from '../../../../../interactors';

const viewPane = Pane({ id:'view-job-profile-pane' });
const resultsPane = Pane({ id:'pane-results' });

export default {
  edit:() => {
    cy.do(viewPane.find(Button('Actions')).click());
    cy.do(Button('Edit').click());
  },

  verifyJobProfileOpened:() => {
    cy.expect(resultsPane.exists());
    cy.expect(viewPane.exists());
  },

  verifyJobProfileName:(profileName) => cy.expect(viewPane.find(HTML(including(profileName))).exists())
};
