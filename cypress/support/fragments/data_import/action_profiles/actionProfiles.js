import { getLongDelay } from '../../../utils/cypressTools';
import { Button } from '../../../../../interactors';

export default class ActionProfiles {
  static createNewActionProfile() {
    cy.do([
      Button('Actions').click(),
      Button('New action profile').click()
    ]);
  }

  static waitLoadingList() {
    cy.get('[id="action-profiles-list"]', getLongDelay())
      .should('be.visible');
    cy.expect(Button('Actions').exists());
  }

  static specialActionProfilePresented(actionProfile) {
    cy.get('[id="action-profiles-list"]')
      .should('contains.text', actionProfile.name);
  }
}
