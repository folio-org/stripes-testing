import permissions from '../../support/dictionary/permissions';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getLongDelay } from '../../support/utils/cypressTools';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import parseMrcFileContentAndVerify, {
  verifyLeaderPositions,
  verify005FieldValue,
  verifyMarcFieldByTag,
} from '../../support/utils/parseMrcFileContent';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import DateTools from '../../support/utils/dateTools';

let user;
let exportedFileNameFromDate;
let exportedFileNameToDate;
const currentDate = DateTools.getFormattedDate({ date: new Date() });
const tomorrowDate = DateTools.getDayTomorrowDateForFiscalYear();
const instanceTitle1 = `AT_C566502_MarcInstance1_${getRandomPostfix()}`;
const instanceTitle2 = `AT_C566502_MarcInstance2_${getRandomPostfix()}`;
const instanceTitle3 = `AT_C566502_MarcInstance3_${getRandomPostfix()}`;
const testData = {
  deletedInstances: [],
};

describe('Data Export', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.dataExportUploadExportDownloadFileViewLogs.gui,
    ]).then((userProperties) => {
      user = userProperties;

      // Create 3 deleted MARC instances
      const instanceTitles = [instanceTitle1, instanceTitle2, instanceTitle3];

      cy.then(() => {
        instanceTitles.forEach((title) => {
          cy.createSimpleMarcBibViaAPI(title).then((instanceId) => {
            cy.getInstanceById(instanceId).then((instanceData) => {
              cy.getSrsRecordsByInstanceId(instanceId).then((srsRecords) => {
                testData.deletedInstances.push({
                  id: instanceId,
                  title,
                  hrid: instanceData.hrid,
                  srsId: srsRecords?.matchedId,
                });
                // Delete via "Set record for deletion"
                InstanceRecordView.markAsDeletedViaApi(instanceId);
              });
            });
          });
        });
      });

      cy.login(user.username, user.password, {
        path: TopMenu.dataExportPath,
        waiter: DataExportLogs.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);

    testData.deletedInstances.forEach((instance) => {
      InventoryInstance.deleteInstanceViaApi(instance.id);
    });

    FileManager.deleteFileFromDownloadsByMask(exportedFileNameFromDate, exportedFileNameToDate);
  });

  it(
    'C566502 Export deleted MARC bib records (firebird)',
    { tags: ['smoke', 'firebird', 'C566502'] },
    () => {
      // Common assertions for MARC record verification
      const commonAssertions = (instance) => [
        (record) => verifyLeaderPositions(record, { 5: 'd' }),
        (record) => verify005FieldValue(record),
        (record) => {
          verifyMarcFieldByTag(record, '245', {
            ind1: ' ',
            ind2: ' ',
            subfields: [['a', instance.title]],
          });
        },
        (record) => {
          verifyMarcFieldByTag(record, '999', {
            ind1: 'f',
            ind2: 'f',
            subfields: [
              ['i', instance.id],
              ['s', instance.srsId],
            ],
          });
        },
      ];

      // Step 1: Initiate export of deleted MARC bib records from today's date
      cy.getAdminToken();
      cy.runDataExportMarcBibDeleted({ from: currentDate }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.jobExecutionId).to.be.a('string');

        const jobExecutionId = response.body.jobExecutionId;
        cy.wait(3000);

        // Step 2-3: Check the data export job is triggered and completed
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
        cy.wait('@getInfo', getLongDelay()).then(({ response: jobResponse }) => {
          const job = jobResponse.body.jobExecutions.find(
            (jobExecution) => jobExecution.id === jobExecutionId,
          );
          exportedFileNameFromDate = job.exportedFiles[0].fileName;
          const recordsCount = job.progress.total;
          const jobHrid = job.hrId;
          const expectedFileName = `deleted-marc-bib-records-${jobHrid}.mrc`;

          expect(exportedFileNameFromDate).to.equal(expectedFileName);

          cy.getUserToken(user.username, user.password);

          DataExportResults.verifyColumnValueByFileName(
            exportedFileNameFromDate,
            'Total',
            `${recordsCount}`,
          );

          // Step 4: Download the recently created file
          DataExportLogs.clickButtonWithText(exportedFileNameFromDate);

          // Step 5: Check exported records included in the file
          const assertionsOnFileContent = testData.deletedInstances.map((instance) => ({
            uuid: instance.id,
            assertions: commonAssertions(instance),
          }));

          parseMrcFileContentAndVerify(
            exportedFileNameFromDate,
            assertionsOnFileContent,
            null, // Don't check exact count - other deleted instances may exist
          );

          DataExportLogs.waitLoading();
          DataExportResults.verifyTableWithResultsExists();
        });
      });

      // Step 6: Initiate export of deleted MARC bib records for all dates until today
      cy.getAdminToken();
      cy.runDataExportMarcBibDeleted({ to: currentDate }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.jobExecutionId).to.be.a('string');

        const jobExecutionId = response.body.jobExecutionId;

        // Step 7-8: Check the data export job is triggered and completed
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfoToDate');
        cy.wait('@getInfoToDate', getLongDelay()).then(({ response: jobResponse }) => {
          const job = jobResponse.body.jobExecutions.find(
            (jobExecution) => jobExecution.id === jobExecutionId,
          );
          exportedFileNameToDate = job.exportedFiles[0].fileName;
          const totalRecordsCount = job.progress.total;
          const exportedRecordsCount = job.progress.exported;
          const jobHrid = job.hrId;
          const expectedFileName = `deleted-marc-bib-records-${jobHrid}.mrc`;

          expect(exportedFileNameToDate).to.equal(expectedFileName);

          cy.getUserToken(user.username, user.password);

          DataExportResults.verifyColumnValueByFileName(
            exportedFileNameToDate,
            'Total',
            `${totalRecordsCount}`,
          );

          // Step 9: Check the number of records in "Total" column via source-storage API
          // The recordsCount includes all deleted MARC bib records until current date
          const formattedDate = DateTools.getCurrentDateYYYYMMDD();

          cy.getAdminToken();

          cy.getSourceStorageMarcRecordIdentifiers(
            "p_05 = 'd'",
            `005.date to '${formattedDate}'`,
          ).then((sourceStorageResponse) => {
            expect(totalRecordsCount).to.eq(sourceStorageResponse.totalCount);
          });

          cy.getUserToken(user.username, user.password);

          // Step 10: Download the recently created file
          DataExportLogs.clickButtonWithText(exportedFileNameToDate);

          // Step 11: Check exported records included in the file
          const assertionsOnFileContentToDate = testData.deletedInstances.map((instance) => ({
            uuid: instance.id,
            assertions: commonAssertions(instance),
          }));

          parseMrcFileContentAndVerify(
            exportedFileNameToDate,
            assertionsOnFileContentToDate,
            exportedRecordsCount,
          );
        });
      });

      DataExportLogs.waitLoading();
      DataExportResults.verifyTableWithResultsExists();

      // Step 12: Initiate export for tomorrow date (should fail)
      cy.getAdminToken();
      cy.runDataExportMarcBibDeleted({
        from: tomorrowDate,
        to: tomorrowDate,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.jobExecutionId).to.be.a('string');

        const jobExecutionId = response.body.jobExecutionId;

        // Step 13-14: Check the data export job fails
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getFailedJob');
        cy.wait('@getFailedJob', getLongDelay()).then(({ response: jobResponse }) => {
          const job = jobResponse.body.jobExecutions.find(
            (jobExecution) => jobExecution.id === jobExecutionId,
          );
          const jobHrid = job.hrId;
          const failedFileName = job.exportedFiles[0].fileName;
          const jobId = job.hrId;

          expect(job.status).to.equal('FAIL');
          expect(job.progress.total).to.equal(0);
          expect(job.progress.exported).to.equal(0);
          expect(failedFileName).to.eq(`deleted-marc-bib-records-${jobHrid}.mrc`);

          cy.getUserToken(user.username, user.password);

          DataExportResults.verifyFailedExportResultCells(
            failedFileName,
            0,
            jobId,
            Cypress.env('diku_login'),
            'Default instances',
            true,
          );

          // Step 15: Click on the row with failed data export job
          DataExportLogs.clickFileNameFromTheList(failedFileName);
          DataExportLogs.verifyErrorTextInErrorLogsPane(
            'ERROR Error while reading from input file with uuids or file is empty',
          );
        });
      });
    },
  );
});
