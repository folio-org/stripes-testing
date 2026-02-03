import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFile from '../../support/fragments/data-export/exportFile';
import SelectJobProfile from '../../support/fragments/data-export/selectJobProfile';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getLongDelay } from '../../support/utils/cypressTools';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
const randomPostfix = getRandomPostfix();
const totalRecordsCount = 3;
const testData = {
  validInstance: {
    title: `AT_C411504_ValidInstance_${randomPostfix}`,
    uuid: null,
    hrid: null,
    srsId: null,
  },
  duplicateInstance: {
    title: `AT_C411504_DuplicateInstance_${randomPostfix}`,
    uuid: null,
    hrid: null,
    srsIds: {
      original: null,
      duplicate: uuid(),
    },
  },
  invalidUuid: uuid(),
  csvFileName: `C411504_instances_${randomPostfix}.csv`,
};

describe('Data Export', () => {
  before('Create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      permissions.inventoryAll.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.createSimpleMarcBibViaAPI(testData.validInstance.title).then((instanceId) => {
        testData.validInstance.uuid = instanceId;

        cy.getInstanceById(instanceId).then((instanceData) => {
          testData.validInstance.hrid = instanceData.hrid;
        });

        cy.getSrsRecordsByInstanceId(instanceId).then((srsRecord) => {
          testData.validInstance.srsId = srsRecord.id;
        });
      });

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

          cy.createSrsRecord(duplicateSrsRecord).then(() => {
            const csvContent = `${testData.validInstance.uuid}\n${testData.duplicateInstance.uuid}\n${testData.invalidUuid}`;

            FileManager.createFile(`cypress/fixtures/${testData.csvFileName}`, csvContent);

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
    InventoryInstance.deleteInstanceViaApi(testData.validInstance.uuid);
    InventoryInstance.deleteInstanceViaApi(testData.duplicateInstance.uuid);
    cy.deleteSrsRecord(testData.duplicateInstance.srsIds.duplicate);
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${testData.csvFileName}`);
  });

  it(
    'C411504 Verify reporting "duplicate" errors and failed instances of exported instances for Default job profile (firebird)',
    { tags: ['extendedPath', 'firebird', 'C411504'] },
    () => {
      // Step 1: Verify Data Export app main page
      DataExportLogs.verifyDragAndDropAreaExists();
      DataExportLogs.verifyUploadFileButtonDisabled(false);
      DataExportLogs.verifyViewAllLogsButtonEnabled();

      // Step 2-3: Upload CSV file and verify job profile selection page
      ExportFile.uploadFile(testData.csvFileName);
      SelectJobProfile.verifySelectJobPane();
      SelectJobProfile.verifySubtitle();
      SelectJobProfile.verifySearchBox();
      SelectJobProfile.verifySearchButton(true);

      // Step 4: Run Default instances export job profile
      ExportFile.exportWithDefaultJobProfile(
        testData.csvFileName,
        'Default instances',
        'Instances',
      );

      // Step 5 & 6: Verify "Completed with errors" status, Failed column, and API response
      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
      cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
        const { jobExecutions } = response.body;
        const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
        const jobId = jobData.hrId;
        const resultFileName = `${testData.csvFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

        expect(jobData.progress).to.have.property('exported', totalRecordsCount);
        expect(jobData.progress).to.have.property('failed', 1);
        expect(jobData.progress).to.have.property('duplicatedSrs', 1);
        expect(jobData.progress).to.have.property('total', totalRecordsCount);
        expect(jobData.progress).to.have.property('readIds', totalRecordsCount);

        DataExportResults.verifyCompletedWithErrorsWithDuplicatesExportResultCells(
          resultFileName,
          totalRecordsCount,
          totalRecordsCount,
          1,
          1,
          jobId,
          user,
        );

        // Step 7: Verify error log details
        DataExportLogs.clickFileNameFromTheList(resultFileName);

        const formattedDateUpToHours = new Date().toISOString().slice(0, 13);

        const errorMessages = [
          new RegExp(`${formattedDateUpToHours}.*ERROR Record not found: ${testData.invalidUuid}`),
          new RegExp(`${formattedDateUpToHours}.*ERROR Failed records number: 1.`),
          `"Instance UUID": "${testData.duplicateInstance.uuid}"`,
          `"Instance HRID": "${testData.duplicateInstance.hrid}"`,
          `"Instance Title": "${testData.duplicateInstance.title}"`,
          new RegExp(
            `"Inventory record link": (${Cypress.config('baseUrl')})?/inventory/view/${testData.duplicateInstance.uuid}`,
          ),
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
        DataExportLogs.verifyTotalErrorLinesCount(3);
      });
    },
  );
});
