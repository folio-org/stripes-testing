import { HTML, including } from '@interactors/html';
import { Button, Pane, Callout, Accordion } from '../../../../../interactors';

const viewPane = Pane({ id:'view-job-profile-pane' });
const resultsPane = Pane({ id:'pane-results' });
const actionsButton = Button('Actions');

export default {
  edit:() => {
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
  verifyLinkedProfiles:() => {
    cy.do(Pane({ id: 'view-job-profile-pane' }).find(Accordion('Overview')).perform(element => {
      console.log(element.querySelectorAll('[data-test-profile-link]'));
      // const currentArray = Array
      //   .from(element.querySelectorAll('[data-test-profile-link]'))
      //   .map(el => el.textContent);


      // console.log(currentArray);
      // expect(expectedQuantity).to.equal(currentArray.length);
      // expect(arrays.compareArrays(expectedArray, currentArray)).to.equal(true);
    }));
  }
};
