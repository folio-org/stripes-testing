import { getLongDelay } from '../../../utils/cypressTools';
import { Button } from '../../../../../interactors';

export default {
  createNewActionProfile: () => {
    cy.do([
      Button('Actions').click(),
      Button('New action profile').click()
    ]);
  },

  waitLoadingList: () => {
    cy.get('[id="action-profiles-list"]', getLongDelay())
      .should('be.visible');
    cy.expect(Button('Actions').exists());
  },

  checkActionProfilePresented: (actionProfile) => {
    cy.get('[id="action-profiles-list"]')
      .should('contains.text', actionProfile.name);
  }
};
