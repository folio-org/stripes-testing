import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
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
let downloadedCQLFile;
const folioInstance = {
  title: `AT_C374153_FolioInstance_${getRandomPostfix()}`,
};

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
      FileManager.deleteFile(`cypress/fixtures/${downloadedCQLFile}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName, downloadedCQLFile);
    });

    it(
      'C374153 Verify change exported file names to the hyperlink color -- CQL (firebird)',
      { tags: ['extendedPath', 'firebird', 'C374153'] },
      () => {
        // Step 1: Go to "Inventory" app
        InventorySearchAndFilter.verifySearchAndFilterPane();

        // Step 2: Search for any instances by selecting any option from "Source" filter option other than MARC
        InventorySearchAndFilter.bySource('FOLIO');
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventorySearchAndFilter.verifyInstanceDisplayed(folioInstance.title);

        // Step 3: Click on the Actions menu and select "Save Instances CQL query"
        InventorySearchAndFilter.saveCQLQuery();
        FileManager.findDownloadedFilesByMask('SearchInstanceCQLQuery*').then(
          (downloadedFilePathes) => {
            const lastDownloadedFilePath =
              downloadedFilePathes.sort()[downloadedFilePathes.length - 1];
            downloadedCQLFile = FileManager.getFileNameFromFilePath(lastDownloadedFilePath);
            InventoryActions.verifySaveCQLQueryFileName(downloadedCQLFile);

            // Step 4: Go to the "Data Export" app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            DataExportLogs.waitLoading();
            DataExportLogs.verifyDragAndDropAreaExists();
            DataExportLogs.verifyUploadFileButtonDisabled(false);
            DataExportLogs.verifyRunningAccordionExpanded();
            DataExportLogs.verifyViewAllLogsButtonEnabled();

            // Step 5: Trigger the data export by submitting .cql file with inventory instances to the "Drag & drop" area
            ExportFile.moveDownloadedFileToFixtures(downloadedCQLFile);
            ExportFile.uploadFile(downloadedCQLFile);

            // Step 6: Run the "Default instance export job profile" by clicking on it => Specify "Instance" UUIDs on the "Are you sure you want to run this job?" modal => Click "Run"
            ExportFile.exportWithDefaultJobProfile(
              downloadedCQLFile,
              'Default instances',
              'Instances',
              '.cql',
            );

            // Wait for export to complete and verify file is created
            cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
              'getJobInfo',
            );
            cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
              const { jobExecutions } = response.body;
              const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
              const jobId = jobData.hrId;
              exportedFileName = `${downloadedCQLFile.replace('.cql', '')}-${jobId}.mrc`;

              DataExportResults.verifySuccessExportResultCells(
                exportedFileName,
                1,
                jobId,
                user.username,
                'Default instances',
                '.cql',
              );

              // Step 7: Verify the new row appeared with created ".mrc" file which is highlighted as hyperlink in blue
              DataExportLogs.verifyFileNameHighlightedInBlue(exportedFileName);

              // Download the recently created file by clicking on its name hyperlink at the "Data Export" logs table
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
      },
    );
  });
});
