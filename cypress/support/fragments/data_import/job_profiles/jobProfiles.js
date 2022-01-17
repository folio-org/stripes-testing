import { Button, TextField, MultiColumnListCell, Modal } from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';
import SettingsDataImport from '../settingsDataImport';

const actionsButton = Button('Actions');

const deleteJobProfile = (profileName) => {
  SettingsDataImport.goToJobProfile();
  cy.do(MultiColumnListCell(profileName).click());
  cy.get('[data-pane-header-actions-dropdown]')
    .should('have.length', 2)
    .eq(1)
    .click();
  cy.do([
    Button('Delete').click(),
    Modal(`Delete "${profileName}" job profile?`).find(Button('Delete')).click(),
  ]);

  cy.expect(MultiColumnListCell(profileName).absent());
};

export default {
  openNewJobProfileForm: () => {
    cy.do([
      actionsButton.click(),
      Button('New job profile').click(),
    ]);
  },

  waitLoadingList:() => {
    cy.get('[id="job-profiles-list"]', getLongDelay())
      .should('be.visible');
    cy.expect(actionsButton.exists());
  },

  checkJobProfilePresented:(jobProfileTitle) => {
    cy.get('[id="job-profiles-list"]')
      .should('contains.text', jobProfileTitle);
  },

  searchJobProfileForImport:(jobProfileTitle) => {
    cy.do(TextField({ id:'input-search-job-profiles-field' }).fillIn(jobProfileTitle));
    cy.do(Button('Search').click());
    cy.expect(MultiColumnListCell(jobProfileTitle).exists());
  },

  runImportFile:(fileName) => {
    cy.do([
      actionsButton.click(),
      Button('Run').click(),
      Modal('Are you sure you want to run this job?').find(Button('Run')).click(),
    ]);

    // wait until uploaded file is displayed in the list
    cy.get('#job-logs-list', getLongDelay()).contains(fileName, getLongDelay());
  },

  deleteJobProfile,
};
