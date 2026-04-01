import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { APPLICATION_NAMES } from '../../../support/constants';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const totalRecordsCount = 2;
const testData = {
  file1: {
    instance: {
      title: `AT_C446049_MarcInstance1_${getRandomPostfix()}`,
      uuid: null,
    },
    csvFileName: `AT_C446049_file1_${getRandomPostfix()}.csv`,
  },
  file2: {
    instance: {
      title: `AT_C446049_MarcInstance2_${getRandomPostfix()}`,
      uuid: null,
      hrid: null,
    },
    csvFileName: `AT_C446049_file2_${getRandomPostfix()}.csv`,
    srsIds: {
      original: null,
      duplicate: uuid(),
    },
  },
};
const getFormattedDateUpToHours = () => new Date().toISOString().slice(0, 13);

describe('Data Export', () => {
  describe('Export to MARC', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create MARC instance for File_1 (no SRS duplicates)
        cy.createSimpleMarcBibViaAPI(testData.file1.instance.title).then((instanceId) => {
          testData.file1.instance.uuid = instanceId;

          // Create CSV file with UUID repeated 2 times for File_1
          const file1Content = `${testData.file1.instance.uuid}\n${testData.file1.instance.uuid}`;

          FileManager.createFile(`cypress/fixtures/${testData.file1.csvFileName}`, file1Content);
        });

        // Create MARC instance for File_2 (with SRS duplicate)
        cy.createSimpleMarcBibViaAPI(testData.file2.instance.title).then((instanceId) => {
          testData.file2.instance.uuid = instanceId;

          // Get instance HRID for verification
          cy.getInstanceById(instanceId).then((instanceData) => {
            testData.file2.instance.hrid = instanceData.hrid;
          });

          // Get the existing SRS record for this instance
          cy.getSrsRecordsByInstanceId(instanceId).then((srsRecord) => {
            testData.file2.srsIds.original = srsRecord.id;

            // Create a duplicate SRS record for the same instance
            const duplicateSrsRecord = {
              ...srsRecord,
              id: testData.file2.srsIds.duplicate,
              matchedId: testData.file2.srsIds.duplicate,
              rawRecord: {
                ...srsRecord.rawRecord,
                id: testData.file2.srsIds.duplicate,
              },
              parsedRecord: {
                ...srsRecord.parsedRecord,
                id: testData.file2.srsIds.duplicate,
                content: {
                  ...srsRecord.parsedRecord.content,
                  fields: srsRecord.parsedRecord.content.fields.map((field) => {
                    if (field['999']) {
                      return {
                        999: {
                          ...field['999'],
                          subfields: field['999'].subfields.map((subfield) => {
                            if (subfield.s) {
                              return { s: testData.file2.srsIds.duplicate };
                            }
                            return subfield;
                          }),
                        },
                      };
                    }
                    return field;
                  }),
                },
              },
            };

            // Create the duplicate SRS record
            cy.createSrsRecord(duplicateSrsRecord).then(() => {
              // Create CSV file with UUID repeated 2 times for File_2
              const file2Content = `${testData.file2.instance.uuid}\n${testData.file2.instance.uuid}`;

              FileManager.createFile(
                `cypress/fixtures/${testData.file2.csvFileName}`,
                file2Content,
              );

              cy.login(user.username, user.password, {
                path: TopMenu.dataExportPath,
                waiter: DataExportLogs.waitLoading,
              });
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();

      [testData.file1.instance, testData.file2.instance].forEach((file) => {
        InventoryInstance.deleteInstanceViaApi(file.uuid);
      });

      cy.deleteSrsRecord(testData.file2.srsIds.duplicate);
      Users.deleteViaApi(user.userId);

      [testData.file1, testData.file2].forEach((file) => {
        FileManager.deleteFile(`cypress/fixtures/${file.csvFileName}`);
      });
    });

    it(
      'C446049 Export completes with errors - view error log (firebird)',
      { tags: ['criticalPath', 'firebird', 'C446049'] },
      () => {
        // Trigger the data export by submitting File_1
        ExportFileHelper.uploadFile(testData.file1.csvFileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifySubtitle();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Run the "Default instance export job profile" for File_1
        ExportFileHelper.exportWithDefaultJobProfile(testData.file1.csvFileName);

        // Check the table with data export log for File_1
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo1');
        cy.wait('@getJobInfo1', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          const resultFileName = `${testData.file1.csvFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifyCompletedWithErrorsExportResultCells(
            resultFileName,
            totalRecordsCount,
            1,
            jobId,
            user,
          );

          // Click on the row with File_1 to view error log
          DataExportLogs.clickFileNameFromTheList(resultFileName);

          // Verify error message for File_1
          const formattedDateUpToHours = getFormattedDateUpToHours();

          const file1Errors = [
            new RegExp(
              `${formattedDateUpToHours}.*ERROR UUID ${testData.file1.instance.uuid} repeated 2 times.`,
            ),
            new RegExp(`${formattedDateUpToHours}.*ERROR Failed records number: 1.`),
          ];

          file1Errors.forEach((error) => {
            DataExportLogs.verifyErrorTextInErrorLogsPane(error);
          });

          // Navigate back to Data export app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          DataExportLogs.waitLoading();
        });

        // Trigger export for File_2
        ExportFileHelper.uploadFile(testData.file2.csvFileName);
        SelectJobProfile.verifySelectJobPane();

        ExportFileHelper.exportWithDefaultJobProfile(testData.file2.csvFileName);

        // Check the table with data export log for File_2
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo2');
        cy.wait('@getJobInfo2', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy, exportedFiles }) => {
            return (
              runBy.userId === user.userId &&
              exportedFiles[0].fileName.includes(testData.file2.csvFileName.replace('.csv', ''))
            );
          });
          const jobId = jobData.hrId;
          const resultFileName = `${testData.file2.csvFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          // Verify the job completed with "Completed with errors" status
          // Exported: 2, Failed: 1, 1 duplicate(s)
          DataExportResults.verifyCompletedWithErrorsWithDuplicatesExportResultCells(
            resultFileName,
            totalRecordsCount,
            2,
            1,
            1,
            jobId,
            user,
          );

          // Click on the row with File_2 to view error log
          DataExportLogs.clickFileNameFromTheList(resultFileName);

          const formattedDateUpToHours = getFormattedDateUpToHours();

          // Verify all error messages for File_2
          const file2Errors = [
            new RegExp(
              `${formattedDateUpToHours}.*ERROR UUID ${testData.file2.instance.uuid} repeated 2 times.`,
            ),
            new RegExp(`${formattedDateUpToHours}.*ERROR Failed records number: 1.`),
            `"Instance UUID": "${testData.file2.instance.uuid}"`,
            `"Instance HRID": "${testData.file2.instance.hrid}"`,
            `"Instance Title": "${testData.file2.instance.title}"`,
            `"Inventory record link": ${Cypress.config('baseUrl')}/inventory/view/${testData.file2.instance.uuid}`,
          ];

          file2Errors.forEach((error) => {
            DataExportLogs.verifyErrorTextInErrorLogsPane(error);
          });

          // Error for SRS duplicates - verify both SRS IDs are present (order not guaranteed)
          const regexParts = [testData.file2.srsIds.original, testData.file2.srsIds.duplicate].map(
            (srsId) => `(?=.*${srsId})`,
          );
          const srsErrorPattern = new RegExp(
            `${formattedDateUpToHours}.*ERROR Instance with HRID: ${testData.file2.instance.hrid} has following SRS records associated: ${regexParts.join('')}`,
          );

          DataExportLogs.verifyErrorTextInErrorLogsPane(srsErrorPattern);
        });
      },
    );
  });
});
