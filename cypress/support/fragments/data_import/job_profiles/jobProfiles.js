import { Button } from '@interactors/html';
import { getLongDelay } from '../../../utils/cypressTools';

export default class JobProfiles {
  static createNewJobProfile() {
    cy.do(
      Button('Actions').click()
    );
    cy.get('[class="DropdownMenu---x9lIp"]')
      .contains('New job profile')
      .click();
  }

  static waitLoadingList() {
    cy.get('[id="job-profiles-list"]', getLongDelay())
      .should('be.visible');
    cy.expect(Button('Actions').exists());
  }

  static checkJobProfilePresented(jobProfileTitle) {
    cy.get('[id="job-profiles-list"]')
      .should('contains.text', jobProfileTitle);
  }
}
