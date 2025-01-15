import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';

describe('fse-data-import - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    `TC195289 - verify that data-import module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'data-import'] },
    () => {
      cy.visit(TopMenu.dataImportPath);
      DataImport.waitLoadingNoInteractors();
    },
  );

  it(
    `TC195767 - check data-import log for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'data-import'] },
    () => {
      cy.visit(TopMenu.dataImportPath);
      DataImport.waitLoadingNoInteractors();
      Logs.openViewAllLogs();
      cy.wait(8000);
      Logs.openFileDetailsByRowNumber();
      DataImport.checkJobSummaryTableExists();
    },
  );
});
