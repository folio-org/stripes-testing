import { Button, TextField, MultiColumnListCell, Modal } from '../../../../../interactors';
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

  static searchJobProfileForImport(jobProfileTitle) {
    cy.do(TextField({ id:'input-search-job-profiles-field' }).fillIn(jobProfileTitle));
    cy.do(Button('Search').click());
    cy.expect(MultiColumnListCell(jobProfileTitle).exists());
  }

  static selectJobProfile(nameProfile) {
    cy.do(MultiColumnListCell(nameProfile).click());
    cy.expect(Button('Actions').exists());
  }

  static runImportFile() {
    cy.do([
      Button('Actions').click(),
      Button('Run').click(),
      Modal('Are you sure you want to run this job?').find(Button('Run')).click(),
    ]);
  }
}
