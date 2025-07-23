import permissions from '../../support/dictionary/permissions';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getLongDelay } from '../../support/utils/cypressTools';
import FileManager from '../../support/utils/fileManager';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: generateItemBarcode(),
};
const fileName = `autoTestFile${getRandomPostfix()}.csv`;

// TODO: identify how to stabilize flaky test

describe('Data Export', () => {
  describe('Generating MARC records on the fly', () => {
    beforeEach('create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;
        const instanceID = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.login(user.username, user.password);
        cy.visit(TopMenu.dataExportPath);
        FileManager.createFile(`cypress/fixtures/${fileName}`, instanceID);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${fileName}`);
    });

    it(
      'C350407 Verify that a user cannot trigger the DATA EXPORT using invalid job profile (firebird)',
      { tags: ['criticalPathBroken', 'firebird', 'C350407'] },
      () => {
        ExportFileHelper.uploadFile(fileName);
        ExportFileHelper.exportWithDefaultJobProfile(fileName, 'Default holdings', 'Holdings');

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then((interception) => {
          const job = interception.response.body.jobExecutions[0];
          const resultFileName = job.exportedFiles[0].fileName;
          const recordsCount = job.progress.total;
          const jobId = job.hrId;

          DataExportResults.verifyFailedExportResultCells(
            resultFileName,
            recordsCount,
            jobId,
            user.username,
            'Default holdings',
          );
        });
      },
    );
  });
});
