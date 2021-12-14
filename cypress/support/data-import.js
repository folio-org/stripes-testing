import TopMenu from './fragments/topMenu';
import { Button } from '../../interactors';
import { getLongDelay } from './utils/cypressTools';

Cypress.Commands.add('uploadFile', (name, jobProfileToRun = 'Default - Create instance and SRS MARC Bib') => {
  cy.visit(TopMenu.dataImportPath);

  // path to the sample MARC file in fixtures to upload.
  const pathToSampleFile = 'CatShip.mrc';

  // before uploading file, change file name with the given unique name.
  cy.get('#pane-jobs-title-content input[type=file]', getLongDelay()).attachFile({ filePath: pathToSampleFile, fileName: name });

  // run file with given jobProfile
  cy.get('#job-profiles-list').contains(jobProfileToRun).click();
  cy.do([
    Button('Actions').click(),
    Button('Run').click(),
    Button('Run').click()
  ]);

  // wait until uploaded file is displayed in the list
  cy.get('#job-logs-list', { timeout: 60000 }).contains(name, { timeout: 60000 });
});

