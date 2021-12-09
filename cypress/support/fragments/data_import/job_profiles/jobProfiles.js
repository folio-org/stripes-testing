import { Button } from '@interactors/html';
import { getLongDelay } from '../../../utils/cypressTools';

export default class JobProfiles {
  static clickButton() {
    cy.do([
      Button('Actions').click(),
    ]);
  }

  static createNewJobProfile() {
    cy.get('[class="DropdownMenu---x9lIp"]')
      .contains('New job profile')
      .click();
  }

  static waitLoadingList() {
    cy.get('[id="job-profiles-list"]', getLongDelay())
      .should('be.visible');
    cy.expect(Button('Actions').exists());
  }

  static specialJobProfilePresented(jobProfileTitle) {
    cy.get('[id="job-profiles-list"]')
      .should('contains.text', jobProfileTitle);
  }
}
