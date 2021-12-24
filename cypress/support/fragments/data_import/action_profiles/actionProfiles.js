import { getLongDelay } from '../../../utils/cypressTools';
import { Button } from '../../../../../interactors';

const actionsButton = Button('Actions');

export default {
  createNewActionProfile: () => {
    cy.do([
      actionsButton.click(),
      Button('New action profile').click()
    ]);
  },

  waitLoadingList: () => {
    cy.get('[id="pane-results-content"]', getLongDelay)
      .should('be.visible');
    cy.expect(actionsButton.exists());
  },

  // TODO create search action profile
  checkActionProfilePresented: (actionProfile) => {
    cy.get('[id="action-profiles-list"]')
      .should('contains.text', actionProfile.name);
  }
};
