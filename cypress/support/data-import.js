import {
  Button,
  MultiColumnList,
} from '../../interactors';
import { getLongDelay } from './utils/cypressTools';

Cypress.Commands.add('uploadFile', (pathToFile) => {
  cy.get('#pane-jobs-title-content > div.upload---2-sT\\+ > input[type=file]')
    .attachFile(pathToFile);

  cy.expect(MultiColumnList({ id: 'job-profiles-list' }).has({ rowCount: 3 }));
  cy.get('[data-row-index="row-0"]').click();
  cy.do([
    Button('Actions').click(),
    Button('Run').click(),
    Button('Run').click()
  ]);

  cy.get('[class*="job---ogB1P"]', getLongDelay()).should('exist');
});
