import permissions from '../../support/dictionary/permissions';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getLongDelay } from '../../support/utils/cypressTools';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instanceName-${getRandomPostfix()}`,
};
const fileName = `autoTestFile${getRandomPostfix()}.csv`;
let instanceHRID;
let holdingsUUID;

describe('data-export', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      const instanceId = InventoryInstances.createInstanceViaApi(item.instanceName, item.barcode);
      cy.getHoldings({
        limit: 1,
        query: `"instanceId"="${instanceId}"`,
      }).then((holdings) => {
        holdingsUUID = holdings[0].id;
        FileManager.createFile(`cypress/fixtures/${fileName}`, holdingsUUID);
      });
      cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${instanceId}"` }).then(
        (instance) => {
          instanceHRID = instance.hrid;
        },
      );
      cy.login(user.username, user.password, {
        path: TopMenu.dataExportPath,
        waiter: DataExportLogs.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${fileName}`);
  });

  it(
    'C376962 Verify that Default mapping profile for holdings maps instance HRID to "004" field (firebird)',
    { tags: ['smoke', 'firebird'] },
    () => {
      ExportFile.uploadFile(fileName);
      ExportFile.exportWithDefaultJobProfile(fileName, 'holdings', 'Holdings');

      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
      cy.wait('@getInfo', getLongDelay()).then((interception) => {
        const job = interception.response.body.jobExecutions[0];
        const resultFileName = job.exportedFiles[0].fileName;
        const recordsCount = job.progress.total;
        const jobId = job.hrId;

        DataExportResults.verifySuccessExportResultCells(
          resultFileName,
          recordsCount,
          jobId,
          user.username,
          'holdings',
        );
        DataExportLogs.clickButtonWithText(resultFileName);
        ExportFile.verifyFileIncludes(resultFileName, [holdingsUUID, instanceHRID]);

        FileManager.deleteFileFromDownloadsByMask(resultFileName);
      });
    },
  );
});
