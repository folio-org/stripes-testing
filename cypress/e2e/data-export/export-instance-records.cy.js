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

describe('data-export', () => {
  beforeEach('create test data', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.dataExportAll.gui,
      permissions.dataExportEnableModule.gui,
    ]).then((userProperties) => {
      user = userProperties;
      const instanceID = InventoryInstances.createInstanceViaApi(
        item.instanceName,
        item.itemBarcode,
      );
      FileManager.createFile(`cypress/fixtures/${fileName}`, instanceID);
      cy.login(user.username, user.password);
      cy.visit(TopMenu.dataExportPath);
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${fileName}`);
  });

  it(
    'C9288 Export small number of instance records - default instance mapping profile (firebird)',
    { tags: ['smoke', 'firebird'] },
    () => {
      ExportFileHelper.uploadFile(fileName);
      ExportFileHelper.exportWithDefaultJobProfile(fileName);

      // collect expected results and verify actual result
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
        );
      });
    },
  );
});
