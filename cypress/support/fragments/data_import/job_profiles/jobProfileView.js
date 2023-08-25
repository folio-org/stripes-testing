import { HTML, including } from '@interactors/html';
import { Button, Pane, Modal } from '../../../../../interactors';

const viewPane = Pane({ id:'view-job-profile-pane' });
const resultsPane = Pane({ id:'pane-results' });
const actionsButton = Button('Actions');

export default {
  edit:() => {
    cy.do(viewPane.find(actionsButton).click());
    cy.do(Button('Edit').click());
  },

  delete:() => {
    cy.do([viewPane.find(actionsButton).click(),
      Button('Delete').click(),
      Modal({ id:'delete-job-profile-modal' }).find(Button({ id:'clickable-delete-job-profile-modal-confirm' })).click()
    ]);
  },

  verifyJobProfileOpened:() => {
    cy.expect(resultsPane.exists());
    cy.expect(viewPane.exists());
  },

  verifyJobProfileName:(profileName) => cy.expect(viewPane.find(HTML(including(profileName))).exists()),
  verifyActionMenuAbsent:() => cy.expect(viewPane.find(actionsButton).absent())
};
