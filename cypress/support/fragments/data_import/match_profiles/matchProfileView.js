/* eslint-disable cypress/no-unnecessary-waiting */
import { HTML, including } from '@interactors/html';
import { Button, Pane, Accordion } from '../../../../../interactors';

const viewPane = Pane({ id: 'view-match-profile-pane' });
const actionsButton = Button('Actions');

export default {
  edit: () => {
    // wait is needed to avoid so fast robot clicks
    cy.wait(1500);
    cy.do(viewPane.find(actionsButton).click());
    cy.do(Button('Edit').click());
    // need to wait until the page will be laoded
    cy.wait(1000);
    cy.expect(Accordion('Match criterion').exists());
  },
  duplicate() {
    cy.do(viewPane.find(actionsButton).click());
    cy.do(Button('Duplicate').click());
  },

  closeViewMode: () => cy.do(viewPane.find(Button({ icon: 'times' })).click()),

  verifyExistingInstanceRecordField: () => {
    cy.expect(viewPane.find(HTML(including('Admin data: Instance UUID'))).exists());
  },
  verifyMatchProfileOpened: () => {
    cy.expect(Pane({ id: 'pane-results' }).exists());
    cy.expect(viewPane.exists());
  },

  verifyActionMenuAbsent: () => cy.expect(viewPane.find(actionsButton).absent()),
  verifyMatchProfileTitleName: (profileName) => cy.get('#view-match-profile-pane-content h2').should('have.text', profileName),
};
