import {
  Button,
  MultiColumnListCell,
  MultiColumnList,
  including
} from '../../interactors';

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

  cy.expect(MultiColumnListCell(including(pathToFile)));
});
