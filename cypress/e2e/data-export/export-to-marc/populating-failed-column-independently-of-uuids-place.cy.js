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
const testData = {
  instanceWithMultipleSRS: {
    title: `AT_C422011_MarcInstance_${getRandomPostfix()}`,
    uuid: null,
    hrid: null,
    srsIds: {
      original: null,
      duplicate: uuid(),
    },
  },
  validInstance1: {
    title: `AT_C422011_ValidMarcInstance1_${getRandomPostfix()}`,
    uuid: null,
  },
  validInstance2: {
    title: `AT_C422011_ValidMarcInstance2_${getRandomPostfix()}`,
    uuid: null,
  },
  invalidUUIDs: ['invalid-uuid-format-12345', 'another-bad-uuid-text'],
  csvFile1: `AT_C422011_file1_${getRandomPostfix()}.csv`,
  csvFile2: `AT_C422011_file2_${getRandomPostfix()}.csv`,
};

describe('Data Export', () => {
  describe('Export to MARC', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create all MARC instances
        [
          testData.instanceWithMultipleSRS,
          testData.validInstance1,
          testData.validInstance2,
        ].forEach((instance) => {
          cy.createSimpleMarcBibViaAPI(instance.title).then((instanceId) => {
            instance.uuid = instanceId;
          });
        });

        // Create additional SRS record for the first instance to simulate multiple SRS records
        cy.then(() => {
          cy.getInstanceById(testData.instanceWithMultipleSRS.uuid).then((instanceData) => {
            testData.instanceWithMultipleSRS.hrid = instanceData.hrid;
          });

          cy.getSrsRecordsByInstanceId(testData.instanceWithMultipleSRS.uuid).then((srsRecord) => {
            testData.instanceWithMultipleSRS.srsIds.original = srsRecord.id;

            const duplicateSrsRecord = {
              ...srsRecord,
              id: testData.instanceWithMultipleSRS.srsIds.duplicate,
              matchedId: testData.instanceWithMultipleSRS.srsIds.duplicate,
              rawRecord: {
                ...srsRecord.rawRecord,
                id: testData.instanceWithMultipleSRS.srsIds.duplicate,
              },
              parsedRecord: {
                ...srsRecord.parsedRecord,
                id: testData.instanceWithMultipleSRS.srsIds.duplicate,
                content: {
                  ...srsRecord.parsedRecord.content,
                  fields: srsRecord.parsedRecord.content.fields.map((field) => {
                    if (field['999']) {
                      return {
                        999: {
                          ...field['999'],
                          subfields: field['999'].subfields.map((subfield) => {
                            if (subfield.s) {
                              return { s: testData.instanceWithMultipleSRS.srsIds.duplicate };
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

            cy.createSrsRecord(duplicateSrsRecord);
          });
        });

        cy.then(() => {
          // Create CSV File 1 with mixed valid/invalid UUIDs in original order
          const file1Content = [
            testData.instanceWithMultipleSRS.uuid,
            testData.invalidUUIDs[0],
            testData.validInstance1.uuid,
            testData.invalidUUIDs[1],
            testData.validInstance2.uuid,
          ].join('\n');

          FileManager.createFile(`cypress/fixtures/${testData.csvFile1}`, file1Content);

          // Create CSV File 2 with UUIDs repositioned (failed UUIDs moved down)
          const file2Content = [
            testData.validInstance1.uuid,
            testData.validInstance2.uuid,
            testData.instanceWithMultipleSRS.uuid,
            testData.invalidUUIDs[0],
            testData.invalidUUIDs[1],
          ].join('\n');

          FileManager.createFile(`cypress/fixtures/${testData.csvFile2}`, file2Content);
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();

      [testData.instanceWithMultipleSRS, testData.validInstance1, testData.validInstance2].forEach(
        (instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.uuid);
        },
      );

      cy.deleteSrsRecord(testData.instanceWithMultipleSRS.srsIds.duplicate);
      Users.deleteViaApi(user.userId);

      [testData.csvFile1, testData.csvFile2].forEach((fileName) => {
        FileManager.deleteFile(`cypress/fixtures/${fileName}`);
      });
    });

    it(
      'C422011 Populating "Failed" column independently of the UUIDs place in a file (firebird)',
      { tags: ['extendedPath', 'firebird', 'C422011'] },
      () => {
        const totalRecords = 5;
        const exportedRecords = 4;
        const failedRecords = 2;
        const duplicatesCount = 1;

        // Step 1: Go to the "Data export" app
        DataExportLogs.verifyDragAndDropAreaExists();
        DataExportLogs.verifyUploadFileButtonDisabled(false);
        DataExportLogs.verifyRunningAccordionExpanded();

        // Steps 2-7: Test both CSV files to verify Failed column is populated identically
        [testData.csvFile1, testData.csvFile2].forEach((csvFileName, index) => {
          // Upload CSV file and select job profile
          ExportFileHelper.uploadFile(csvFileName);
          SelectJobProfile.verifySelectJobPane();
          SelectJobProfile.verifySubtitle();
          SelectJobProfile.verifySearchBox();
          SelectJobProfile.verifySearchButton(true);
          ExportFileHelper.exportWithDefaultJobProfile(csvFileName);

          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(
            `getJobInfo_${index}`,
          );
          cy.wait(`@getJobInfo_${index}`, getLongDelay()).then(({ response }) => {
            const { jobExecutions } = response.body;
            const jobData = jobExecutions.find(({ runBy, exportedFiles }) => {
              return (
                runBy.userId === user.userId &&
                exportedFiles[0].fileName.includes(csvFileName.replace('.csv', ''))
              );
            });
            const jobId = jobData.hrId;
            const resultFileName = `${csvFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

            // Verify the "Total", "Exported" and "Failed" columns
            DataExportResults.verifyCompletedWithErrorsWithDuplicatesExportResultCells(
              resultFileName,
              totalRecords,
              exportedRecords,
              failedRecords,
              duplicatesCount,
              jobId,
              user,
            );
            DataExportLogs.clickFileNameFromTheList(resultFileName);

            const formattedDateUpToHours = new Date().toISOString().slice(0, 13);

            testData.invalidUUIDs.forEach((invalidUUID) => {
              DataExportLogs.verifyErrorTextInErrorLogsPane(
                new RegExp(`${formattedDateUpToHours}.*ERROR Invalid UUID format:.*${invalidUUID}`),
              );
            });

            const regexParts = [
              testData.instanceWithMultipleSRS.srsIds.original,
              testData.instanceWithMultipleSRS.srsIds.duplicate,
            ].map((srsId) => `(?=.*${srsId})`);
            const srsErrorPattern = new RegExp(
              `${formattedDateUpToHours}.*ERROR Instance with HRID: ${testData.instanceWithMultipleSRS.hrid} has following SRS records associated: ${regexParts.join('')}`,
            );

            DataExportLogs.verifyErrorTextInErrorLogsPane(srsErrorPattern);

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            DataExportLogs.waitLoading();
          });
        });
      },
    );
  });
});
