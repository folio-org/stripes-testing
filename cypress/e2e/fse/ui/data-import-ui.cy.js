import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';

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
    { tags: ['fse', 'ui', 'data-import'] },
    () => {
      cy.visit(TopMenu.dataImportPath);
      DataImport.waitLoadingNoInteractors();
      Logs.openViewAllLogs();
      cy.wait(8000);
      Logs.openFileDetailsByRowNumber();
      DataImport.checkJobSummaryTableExists();
    },
  );

  it(
    `TC195768 - check data-import file upload for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'data-import'] },
    () => {
      // upload small marc file
      const testData = {
        marcFile: {
          marc: 'marcFileForC376006.mrc',
          fileName: `C376006 testMarcFile.${getRandomPostfix()}.mrc`,
        },
      };

      cy.visit(TopMenu.dataImportPath);
      DataImport.waitLoadingNoInteractors();
      DataImport.uploadFile(testData.marcFile.marc, testData.marcFile.fileName);
      JobProfiles.waitLoadingList();
      // delete uploaded file without starting job
      JobProfiles.deleteUploadedFile(testData.marcFile.fileName);
      JobProfiles.verifyDeleteUploadedFileModal();
      JobProfiles.confirmDeleteUploadedFile();
      DataImport.waitLoadingNoInteractors();
    },
  );
});
