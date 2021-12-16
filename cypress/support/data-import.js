import TopMenu from './fragments/topMenu';
import { Button } from '../../interactors';
import { getLongDelay } from './utils/cypressTools';

Cypress.Commands.add('uploadFile', (name, jobProfileToRun = 'Default - Create instance and SRS MARC Bib') => {
  cy.visit(TopMenu.dataImportPath);

  // upload generated file with given unique name
  cy.get('#pane-jobs-title-content input[type=file]', getLongDelay()).attachFile(name);

  // run file with given jobProfile
  cy.get('#job-profiles-list').contains(jobProfileToRun).click();
  cy.do([
    Button('Actions').click(),
    Button('Run').click(),
    Button('Run').click()
  ]);

  // wait until uploaded file is displayed in the list
  cy.get('#job-logs-list', getLongDelay()).contains(name, getLongDelay());
});

