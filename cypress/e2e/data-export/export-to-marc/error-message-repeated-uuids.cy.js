import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

let user;
const csvFileName = `repeatedUUIDs_${getRandomPostfix()}.csv`;
const instanceIds = [];
const numberOfInstances = 5;

describe('Data Export', () => {
  describe('Export to MARC', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
          const instanceTypeId = instanceTypeData[0].id;

          // Create test instances dynamically
          for (let i = 0; i < numberOfInstances; i++) {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: `AT_C476789_FolioInstance_${randomFourDigitNumber()}`,
              },
            }).then((createdInstanceData) => {
              instanceIds.push(createdInstanceData.instanceId);
            });
          }
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });

        // Create CSV file with repeated UUIDs according to requirements
        cy.then(() => {
          // Configuration: how many times each UUID should appear
          const repeatCounts = [1, 2, 3, 4, 5];

          const csvContent = instanceIds
            .map((instanceId, index) => {
              const repeatCount = repeatCounts[index];
              return Array(repeatCount).fill(instanceId).join('\n');
            })
            .join('\n');

          // Create the CSV file with both unrepeated and repeated UUIDs
          FileManager.createFile(`cypress/fixtures/${csvFileName}`, csvContent);
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();

      instanceIds.forEach((instanceId) => {
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
    });

    it(
      'C476789 Error message for repeated UUIDs in the .csv file (firebird)',
      { tags: ['criticalPath', 'firebird', 'C476789'] },
      () => {
        // Step 1: Trigger the data export by clicking on "or choose file" button and submitting .csv file
        ExportFileHelper.uploadFile(csvFileName);

        // Step 2: Run the Default instances job profile
        ExportFileHelper.exportWithDefaultJobProfile(csvFileName, 'Default instances', 'Instances');

        // Step 3: Wait for job completion and verify it completes with "Completed with errors" status
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          const totalRecordsCount = 15;
          const exportedRecordsCount = 5;
          const resultFileName = `${csvFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifyCompletedWithErrorsExportResultCells(
            resultFileName,
            totalRecordsCount,
            exportedRecordsCount,
            jobId,
            user,
            'Default instances',
          );

          // Step 4: Click on the row with recently completed job to view error details
          DataExportLogs.clickFileNameFromTheList(resultFileName);

          const date = new Date();
          const formattedDateUpToHours = date.toISOString().slice(0, 13);
          const expectedRepeats = [
            { instanceIndex: 1, repeatCount: 2 },
            { instanceIndex: 2, repeatCount: 3 },
            { instanceIndex: 3, repeatCount: 4 },
            { instanceIndex: 4, repeatCount: 5 },
          ];

          expectedRepeats.forEach(({ instanceIndex, repeatCount }) => {
            DataExportLogs.verifyErrorTextInErrorLogsPane(
              new RegExp(
                `${formattedDateUpToHours}.*ERROR UUID ${instanceIds[instanceIndex]} repeated ${repeatCount} times`,
              ),
            );
          });
        });
      },
    );
  });
});
