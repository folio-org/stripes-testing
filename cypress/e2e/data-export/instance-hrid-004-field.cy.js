import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import parallelization from '../../support/dictionary/parallelization';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../support/utils/stringTools';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import { getLongDelay } from '../../support/utils/cypressTools';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../support/fragments/data-export/exportFile';

let user;
const item = {
  barcode: getRandomPostfix(),
  instanceName: `instanceName-${getRandomPostfix()}`,
};
const fileName = `autoTestFile${getRandomPostfix()}.csv`;
let instanceHRID;
let holdingsUUID;

describe('Data Export - Holdings records export', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.dataExportEnableSettings.gui,
      permissions.dataExportEnableApp.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.dataExportPath,
        waiter: DataExportLogs.waitLoading,
      });
    });
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
  });

  after('delete test data', () => {
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.barcode);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${fileName}`);
  });

  it(
    'C376962 Verify that Default mapping profile for holdings maps instance HRID to "004" field (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird, parallelization.nonParallel] },
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
