import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../../support/constants';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';

let user;
let exportedFileName;
const folioInstance = {
  title: `AT_C374152_FolioInstance_${getRandomPostfix()}`,
};
const csvFileName = `AT_C374152_instanceUUIDs_${getRandomPostfix()}.csv`;

describe('Data Export', () => {
  describe('Generating MARC records on the fly', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: folioInstance.title,
            },
          }).then((createdInstanceData) => {
            folioInstance.id = createdInstanceData.instanceId;
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(folioInstance.id);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask('SearchInstanceUUIDs*', exportedFileName);
    });

    it(
      'C374152 Verify change exported file names to the hyperlink color (firebird)',
      { tags: ['extendedPath', 'firebird', 'C374152'] },
      () => {
        // Step 1: Go to "Inventory" app
        InventorySearchAndFilter.verifySearchAndFilterPane();

        // Step 2: Search for any instances by selecting any option from "Source" filter option other than MARC
        InventorySearchAndFilter.bySource('FOLIO');
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventorySearchAndFilter.verifyInstanceDisplayed(folioInstance.title);

        // Step 3: Click on the "Actions" menu and select "Save Instances UUIDs"
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(csvFileName, 'SearchInstanceUUIDs*');

        // Step 4: Go to the "Data Export" app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        DataExportLogs.waitLoading();
        DataExportLogs.verifyDragAndDropAreaExists();
        DataExportLogs.verifyUploadFileButtonEnabled();
        DataExportLogs.verifyRunningAccordionExpanded();
        DataExportLogs.verifyViewAllLogsButtonEnabled();

        // Step 5: Trigger the data export by submitting .csv file with UUIDs of inventory instances to the "Drag & drop" area
        ExportFile.uploadFile(csvFileName);

        // Step 6: Run the "Default instance export job profile"
        ExportFile.exportWithDefaultJobProfile(csvFileName, 'Default instances', 'Instances');

        // Wait for export to complete and verify file is created
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          exportedFileName = `${csvFileName.replace('.csv', '')}-${jobId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            1,
            jobId,
            user.username,
            'Default instances',
          );

          // Step 7: Verify the new row appeared with created ".mrc" file which is highlighted as hyperlink in blue
          DataExportLogs.verifyFileNameHighlightedInBlue(exportedFileName);

          // Download the recently created file with extension .mrc by clicking on a file name
          DataExportLogs.clickButtonWithText(exportedFileName);

          const assertionsOnMarcFileContent = [
            {
              uuid: folioInstance.id,
              assertions: [
                (record) => {
                  const titleField = record.get('245')[0];

                  expect(titleField.ind1).to.eq('0');
                  expect(titleField.ind2).to.eq('0');
                  expect(titleField.subf[0][0]).to.eq('a');
                  expect(titleField.subf[0][1]).to.eq(folioInstance.title);
                },
                (record) => expect(record.get('999')[0].subf[0][0]).to.eq('i'),
                (record) => {
                  expect(record.get('999')[0].subf[0][1]).to.eq(folioInstance.id);
                },
              ],
            },
          ];

          parseMrcFileContentAndVerify(exportedFileName, assertionsOnMarcFileContent, 1);
        });
      },
    );
  });
});
