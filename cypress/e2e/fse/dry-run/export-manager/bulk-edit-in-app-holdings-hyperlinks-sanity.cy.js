import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import ExportManagerSearchPane from '../../../../support/fragments/exportManager/exportManagerSearchPane';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import ExportDetails from '../../../../support/fragments/exportManager/exportDetails';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';
import { parseSanityParameters } from '../../../../support/utils/users';

describe('Export Manager', () => {
  const { user, memberTenant } = parseSanityParameters();
  const holdingHRIDsFileName = `holdingHRIDs-${getRandomPostfix()}.csv`;
  const matchedRecordsFileName = `*Matched-Records-${holdingHRIDsFileName}`;
  const item = {
    instanceName: `AT_C365104_testBulkEdit_${getRandomPostfix()}`,
    itemBarcode: getRandomPostfix(),
  };

  before('Setup', () => {
    cy.setTenant(memberTenant.id);
    cy.getUserToken(user.username, user.password, { log: false })
      .then(() => {
        // Fetch user details
        cy.getUserDetailsByUsername(user.username).then((details) => {
          user.id = details.id;
          user.personal = details.personal;
          user.barcode = details.barcode;
        });
      })
      .then(() => {
        // Create test data
        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${item.instanceId}"`,
        }).then((holdings) => {
          item.holdingHRID = holdings[0].hrid;
          FileManager.createFile(`cypress/fixtures/${holdingHRIDsFileName}`, holdings[0].hrid);
        });
      });
  });

  after('Cleanup', () => {
    cy.getUserToken(user.username, user.password, { log: false });
    cy.setTenant(memberTenant.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
    FileManager.deleteFile(`cypress/fixtures/${holdingHRIDsFileName}`);
    FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
  });

  it(
    'C365104 Verify hyperlink on the "JobID" column -- Holdings in app approach (firebird) (TaaS)',
    { tags: ['dryRun', 'firebird', 'C365104'] },
    () => {
      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      cy.allure().logCommandSteps(true);

      BulkEditSearchPane.checkHoldingsRadio();
      BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');

      let dataExportJobId;

      cy.intercept('POST', /\/bulk-operations\/.*\/start/).as('uploadFile');
      BulkEditSearchPane.uploadFile(holdingHRIDsFileName);
      cy.wait('@uploadFile').then((interception) => {
        dataExportJobId = interception.response.body.dataExportJobId;

        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.waitFileUploading();

        TopMenuNavigation.navigateToAppAdaptive(APPLICATION_NAMES.EXPORT_MANAGER);
        ExportManagerSearchPane.waitLoading();

        let jobID;

        cy.intercept('GET', '/data-export-spring/jobs?*').as('getJobs');
        ExportManagerSearchPane.searchByBulkEdit();

        cy.wait('@getJobs', { timeout: 10000 }).then((res) => {
          jobID = res.response.body.jobRecords.find((job) => job.id === dataExportJobId).name;

          ExportManagerSearchPane.selectJob(jobID);
          ExportManagerSearchPane.verifyJobDataInResults(['Successful', 'Bulk edit identifiers']);
          ExportManagerSearchPane.clickJobIdInThirdPane();
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.holdingHRID]);
          FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
          ExportDetails.closeJobDetails();
          ExportManagerSearchPane.clickJobId(jobID);
          ExportFile.verifyFileIncludes(matchedRecordsFileName, [item.holdingHRID]);
        });
      });
    },
  );
});
