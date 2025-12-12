import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import { APPLICATION_NAMES } from '../../support/constants';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import { getLongDelay } from '../../support/utils/cypressTools';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
const randomPostfix = getRandomPostfix();
const testData = {
  duplicateInstance: {
    title: `AT_C446170_DuplicateInstance_${randomPostfix}`,
    uuid: null,
    hrid: null,
    srsIds: {
      original: null,
      duplicate: uuid(),
    },
  },
};

describe('Data Export', () => {
  before('Create test data', () => {
    cy.createTempUser([
      permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.createSimpleMarcBibViaAPI(testData.duplicateInstance.title).then((instanceId) => {
        testData.duplicateInstance.uuid = instanceId;

        cy.getInstanceById(instanceId).then((instanceData) => {
          testData.duplicateInstance.hrid = instanceData.hrid;
        });

        cy.getSrsRecordsByInstanceId(instanceId).then((srsRecord) => {
          testData.duplicateInstance.srsIds.original = srsRecord.id;

          const duplicateSrsRecord = {
            ...srsRecord,
            id: testData.duplicateInstance.srsIds.duplicate,
            matchedId: testData.duplicateInstance.srsIds.duplicate,
            rawRecord: {
              ...srsRecord.rawRecord,
              id: testData.duplicateInstance.srsIds.duplicate,
            },
            parsedRecord: {
              ...srsRecord.parsedRecord,
              id: testData.duplicateInstance.srsIds.duplicate,
              content: {
                ...srsRecord.parsedRecord.content,
                fields: srsRecord.parsedRecord.content.fields.map((field) => {
                  if (field['999']) {
                    return {
                      999: {
                        ...field['999'],
                        subfields: field['999'].subfields.map((subfield) => {
                          if (subfield.s) {
                            return { s: testData.duplicateInstance.srsIds.duplicate };
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
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    InventoryInstance.deleteInstanceViaApi(testData.duplicateInstance.uuid);
    cy.deleteSrsRecord(testData.duplicateInstance.srsIds.duplicate);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
  });

  it(
    'C446170 Verify reporting "duplicate" errors of exported instances for "Quick export" (firebird)',
    { tags: ['extendedPath', 'firebird', 'C446170'] },
    () => {
      // Step 1: Select instance in Inventory
      InventorySearchAndFilter.searchInstanceByTitle(testData.duplicateInstance.title);
      InventorySearchAndFilter.selectResultCheckboxes(1);
      InventorySearchAndFilter.verifySelectedRecords(1);

      // Step 2-4: Click "Actions" → "Export instances (MARC)" and verify CSV file download
      cy.intercept('/data-export/quick-export').as('quickExport');
      InventorySearchAndFilter.exportInstanceAsMarc();

      // Step 5: Verify CSV file download with correct naming and UUID content
      cy.wait('@quickExport', getLongDelay()).then((req) => {
        const expectedIDs = req.request.body.uuids;

        FileManager.verifyFile(
          InventoryActions.verifyInstancesMARCFileName,
          'QuickInstanceExport*',
          InventoryActions.verifyInstancesMARC,
          [expectedIDs],
        );

        FileManager.findDownloadedFilesByMask('QuickInstanceExport*.csv').then((files) => {
          const csvFileName = files[0];
          const timestampPattern = /QuickInstanceExport\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}.*\.csv/;

          expect(csvFileName).to.match(timestampPattern);

          ExportFile.verifyCSVFileRecordsNumber('QuickInstanceExport*.csv', 1);
        });
      });

      // Step 6: Navigate to Data Export app
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
      DataExportLogs.waitLoading();

      // Step 7-10: Verify completed job with errors and API response
      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
      cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
        const { jobExecutions } = response.body;
        const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);

        // Step 10: Verify API response
        expect(jobData.progress).to.have.property('exported', 2);
        expect(jobData.progress).to.have.property('failed', 0);
        expect(jobData.progress).to.have.property('duplicatedSrs', 1);
        expect(jobData.progress).to.have.property('total', 1);
        expect(jobData.progress).to.have.property('readIds', 0);

        const jobId = jobData.hrId;
        const resultFileName = `quick-export-${jobId}.mrc`;

        DataExportResults.verifyCompletedWithErrorsWithDuplicatesExportResultCells(
          resultFileName,
          1,
          2,
          0,
          1,
          jobId,
          user,
        );

        // Step 11: Click job row and verify error log
        DataExportLogs.clickFileNameFromTheList(resultFileName);

        const formattedDateUpToHours = new Date().toISOString().slice(0, 13);
        const errorMessages = [
          `"Instance UUID": "${testData.duplicateInstance.uuid}"`,
          `"Instance HRID": "${testData.duplicateInstance.hrid}"`,
          `"Instance Title": "${testData.duplicateInstance.title}"`,
          `"Inventory record link": /inventory/view/${testData.duplicateInstance.uuid}`,
        ];

        errorMessages.forEach((error) => {
          DataExportLogs.verifyErrorTextInErrorLogsPane(error);
        });

        const regexParts = [
          testData.duplicateInstance.srsIds.original,
          testData.duplicateInstance.srsIds.duplicate,
        ].map((srsId) => `(?=.*${srsId})`);
        const srsErrorPattern = new RegExp(
          `${formattedDateUpToHours}.*ERROR Instance with HRID: ${testData.duplicateInstance.hrid} has following SRS records associated: ${regexParts.join('')}`,
        );

        DataExportLogs.verifyErrorTextInErrorLogsPane(srsErrorPattern);
        DataExportLogs.verifyTotalErrorLinesCount(1);
      });
    },
  );
});
