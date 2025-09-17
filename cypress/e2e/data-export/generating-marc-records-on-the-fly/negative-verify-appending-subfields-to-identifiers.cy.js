/* eslint-disable no-unused-expressions */
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';

let user;
let instanceTypeId;
let exportedFileName;
const csvFileName = `AT_C350444_instanceUUIDs_${getRandomPostfix()}.csv`;
const testData = {
  instanceTitle: `AT_C350444_FolioInstance_${getRandomPostfix()}`,
  instanceId: '',
};

// Helper function to verify field does NOT exist
const verifyFieldDoesNotExist = (record, fieldNumber) => {
  const fields = record.get(fieldNumber);
  expect(fields).to.be.empty;
};

describe('Data Export', () => {
  describe('Generating MARC records on the fly', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.dataExportViewAddUpdateProfiles.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          instanceTypeId = instanceTypeData[0].id;

          // Create instance WITHOUT any identifiers
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: testData.instanceTitle,
            },
          }).then((createdInstanceData) => {
            testData.instanceId = createdInstanceData.instanceId;

            FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.instanceId);
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        cy.wait(5000);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C350444 Negative: Verify appending subfields to Identifiers (firebird)',
      { tags: ['extendedPath', 'firebird', 'C350444'] },
      () => {
        // Step 1: Go to the "Data Export" app (already there from before hook)
        DataExportLogs.verifyDragAndDropAreaExists();

        // Step 2: Trigger the data export by submitting .csv file with UUIDs of inventory instances
        ExportFile.uploadFile(csvFileName);

        // Step 3: Run the "Default instance export job profile"
        ExportFile.exportWithDefaultJobProfile(csvFileName, 'Default instances', 'Instances');

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

          // Step 4: Download the recently created file by clicking on file name
          DataExportLogs.clickButtonWithText(exportedFileName);

          // Steps 5-6: Verify that identifier fields do NOT exist in the MARC record
          const assertionsOnMarcFileContent = [
            {
              uuid: testData.instanceId,
              assertions: [
                (record) => {
                  // Verify that identifier fields do NOT exist:

                  // 1-5. Fields that should map to 024 with indicator 8 (ASIN, BNB, Local identifiers, StEdNL, UKMac)
                  // 6-8. Fields that should map to 024 with indicator 7 (DOI, Handle, URN)
                  // 11-14. Fields that should map to 024 with indicators 2 or 1 (ISMN, Invalid ISMN, UPC, Invalid UPC)
                  verifyFieldDoesNotExist(record, '024');

                  // 9. CODEN should map to field 030
                  verifyFieldDoesNotExist(record, '030');

                  // 10. Report number should map to field 088
                  verifyFieldDoesNotExist(record, '088');
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
