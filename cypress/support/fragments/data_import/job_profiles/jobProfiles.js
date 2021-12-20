import { Button, TextField, MultiColumnListCell, Modal } from '../../../../../interactors';
import { getLongDelay } from '../../../utils/cypressTools';

export default {
  createNewJobProfile: () => {
    cy.do([
      Button('Actions').click(),
      Button('New job profile').click(),
    ]);
  },

  waitLoadingList:() => {
    cy.get('[id="job-profiles-list"]', getLongDelay())
      .should('be.visible');
    cy.expect(Button('Actions').exists());
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

  selectJobProfile:(nameProfile) => {
    cy.do(MultiColumnListCell(nameProfile).click());
    cy.expect(Button('Actions').exists());
  },

  runImportFile:() => {
    cy.do([
      Button('Actions').click(),
      Button('Run').click(),
      Modal('Are you sure you want to run this job?').find(Button('Run')).click(),
    ]);
  },
};
