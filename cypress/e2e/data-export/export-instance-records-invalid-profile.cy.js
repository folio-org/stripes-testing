import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import FileManager from '../../support/utils/fileManager';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import getRandomPostfix from '../../support/utils/stringTools';
import { getLongDelay } from '../../support/utils/cypressTools';
import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import generateItemBarcode from '../../support/utils/generateItemBarcode';

let user;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: generateItemBarcode(),
};
const fileName = `autoTestFile${getRandomPostfix()}.csv`;

// TODO: identify how to stabilize flaky test

describe('data-export', () => {
  beforeEach('create test data', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password);
      cy.visit(TopMenu.dataExportPath);
      const instanceID = InventoryInstances.createInstanceViaApi(
        item.instanceName,
        item.itemBarcode,
      );
      FileManager.createFile(`cypress/fixtures/${fileName}`, instanceID);
    });
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${fileName}`);
  });

  it(
    'C350407 Verify that a user cannot trigger the DATA EXPORT using invalid job profile (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      ExportFileHelper.uploadFile(fileName);
      ExportFileHelper.exportWithDefaultJobProfile(fileName, 'holdings', 'Holdings');

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
          'holdings',
        );
      });
    },
  );
});
