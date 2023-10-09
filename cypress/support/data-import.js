/* eslint-disable cypress/no-unnecessary-waiting */
import { Button, HTML, including, Modal, MultiColumnListCell, Section } from '../../interactors';
import { getLongDelay } from './utils/cypressTools';
import JobProfiles from './fragments/data_import/job_profiles/jobProfiles';

Cypress.Commands.add(
  'uploadFileWithDefaultJobProfile',
  (name, jobProfileToRun = 'Default - Create instance and SRS MARC Bib') => {
    // upload generated file with given unique name
    cy.get('input[type=file]', getLongDelay()).attachFile(name);
    cy.expect(
      Section({ id: 'pane-upload' })
        .find(HTML(including(name)))
        .exists(),
    );
    cy.expect(Button({ icon: 'trash' }).exists());

    JobProfiles.search(jobProfileToRun);
    // run file with given jobProfile
    cy.do(MultiColumnListCell(jobProfileToRun).click());
    cy.do([Button('Actions').click(), Button('Run').click()]);
    cy.do(Modal({ id: 'run-job-profile-modal' }).find(Button('Run')).click());
    cy.get('#pane-logs-title').contains(name);
  },
);
