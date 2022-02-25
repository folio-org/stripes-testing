import { Button, MultiColumnListCell, Section, HTML, including, Modal } from '../../interactors';
import { getLongDelay } from './utils/cypressTools';

Cypress.Commands.add('uploadFileWithDefaultJobProfile', (name, jobProfileToRun = 'Default - Create instance and SRS MARC Bib') => {
  // upload generated file with given unique name
  cy.get('input[type=file]', getLongDelay()).attachFile(name);
  // run file with given jobProfile
  cy.do(MultiColumnListCell(jobProfileToRun).click());
  cy.do([
    Button('Actions').click(),
    Button('Run').click(),
  ]);
  cy.do(Modal({ id:'run-job-profile-modal' }).find(Button('Run')).click());
  // wait until uploaded file is displayed in the list
  cy.expect(Section({ id: 'pane-logs-title' }).find(HTML(including(name))).exists());
});

