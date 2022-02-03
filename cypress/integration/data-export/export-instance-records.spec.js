import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import TestTypes from '../../support/dictionary/testTypes';
import FileManager from '../../support/utils/fileManager';
import DownloadHelper from '../../support/fragments/data-export/export-marc-file';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import getRandomPostfix from '../../support/utils/stringTools';


describe('export instance records', () => {
  beforeEach('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C9288 Export small number of instance records - default instance mapping profile', { tags: [TestTypes.smoke] }, () => {
    const fileName = `autoTestFile${getRandomPostfix()}.csv`;

    // download file with existing UUIDs
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.byEffectiveLocation();
    InventorySearch.saveUUIDs();
    DownloadHelper.downloadCSVFile(fileName, 'SearchInstanceUUIDs*');

    // export file with UUIDs
    cy.visit(TopMenu.dataExportPath);
    ExportFileHelper.uploadFile(fileName);
    ExportFileHelper.exportWithDefaultInstancesJobProfile(fileName);

    // collect expected results and verify actual result
    cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
    cy.wait('@getInfo', { requestTimeout: 30000 }).then((interception) => {
      const job = interception.response.body.jobExecutions[0];
      const resultFileName = job.exportedFiles[0].fileName;
      const recordsCount = job.progress.total;
      const jobId = job.hrId;

      DataExportResults.verifySuccessExportResultCells(resultFileName, recordsCount, jobId);
    });

    // delete created files
    FileManager.deleteFile(`cypress/fixtures/${fileName}`);
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  });
});
