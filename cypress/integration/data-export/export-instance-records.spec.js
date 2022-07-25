import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import TestTypes from '../../support/dictionary/testTypes';
import FileManager from '../../support/utils/fileManager';
import DownloadHelper from '../../support/fragments/data-export/export-marc-file';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import getRandomPostfix from '../../support/utils/stringTools';
import { getLongDelay } from '../../support/utils/cypressTools';
import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';


let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('data-export', () => {
  beforeEach('create test data', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.dataExportAll.gui,
      permissions.dataExportEnableModule.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password);
        InventoryInstances.createInstanceViaApi(item.instanceName, item.itemBarcode);
      });
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    users.deleteViaApi(user.userId);
  });

  it('C9288 Export small number of instance records - default instance mapping profile (firebird)', { retries: 3, tags: [TestTypes.smoke, devTeams.firebird] }, () => {
    const fileName = `autoTestFile${getRandomPostfix()}.csv`;

    // download file with existing UUIDs
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.switchToItem();
    InventorySearch.searchByParameter('Barcode', item.itemBarcode);
    InventorySearch.saveUUIDs();
    DownloadHelper.downloadCSVFile(fileName, 'SearchInstanceUUIDs*');

    // export file with UUIDs
    cy.visit(TopMenu.dataExportPath);
    ExportFileHelper.uploadFile(fileName);
    ExportFileHelper.exportWithDefaultInstancesJobProfile(fileName);

    // collect expected results and verify actual result
    cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
    cy.wait('@getInfo', getLongDelay()).then((interception) => {
      const job = interception.response.body.jobExecutions[0];
      const resultFileName = job.exportedFiles[0].fileName;
      const recordsCount = job.progress.total;
      const jobId = job.hrId;

      DataExportResults.verifySuccessExportResultCells(resultFileName, recordsCount, jobId, user.username);
    });

    // delete created files
    FileManager.deleteFile(`cypress/fixtures/${fileName}`);
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
  });
});
