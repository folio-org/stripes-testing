import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import SelectJobProfile from '../../../support/fragments/data-export/selectJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let instanceTypeId;
const randomPostfix = getRandomPostfix();
const csvFileName = `AT_C446176_validAndEmptyRows_${randomPostfix}.csv`;
const folioInstanceTitle = `AT_C446176_FolioInstance_${randomPostfix}`;
const marcInstanceTitle = `AT_C446176_MarcInstance_${randomPostfix}`;
const testData = {
  validInstanceIds: [],
  emptyRowsCount: 3,
  allLines: [],
};

describe('Data Export', () => {
  describe('Export to MARC', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 })
          .then((instanceTypeData) => {
            instanceTypeId = instanceTypeData[0].id;
          })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: folioInstanceTitle,
              },
            }).then((createdInstanceData) => {
              testData.validInstanceIds.push(createdInstanceData.instanceId);
            });
          })
          .then(() => {
            cy.createSimpleMarcBibViaAPI(marcInstanceTitle).then((instanceId) => {
              testData.validInstanceIds.push(instanceId);
            });
          })
          .then(() => {
            testData.allLines = [...testData.validInstanceIds];
            // append empty rows (blank lines) to simulate empty UUID entries
            for (let i = 0; i < testData.emptyRowsCount; i += 1) {
              testData.allLines.push('');
            }
            FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.allLines.join('\n'));
          });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      testData.validInstanceIds.forEach((instanceId) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      });

      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask(csvFileName.replace('.csv', ''));
    });

    it(
      'C446176 Export .csv file with valid UUIDs and empty rows in the file (firebird)',
      { tags: ['extendedPath', 'firebird', 'C446176'] },
      () => {
        // Step 1: Trigger the data export by clicking on the "or choose file" button and submitting .csv file with Instance UUIDs + empty rows
        ExportFileHelper.uploadFile(csvFileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifyExistingJobProfiles();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2: Run the Default instances job profile
        ExportFileHelper.exportWithDefaultJobProfile(csvFileName);

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          const totalRecordsCount = testData.allLines.length - 1;
          const resultFileName = `${csvFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifyCompletedWithErrorsExportResultCells(
            resultFileName,
            totalRecordsCount,
            testData.validInstanceIds.length,
            jobId,
            user,
          );

          cy.getUserToken(user.username, user.password);

          // Step 3: Click on the row with recently completed with errors job in the logs table
          DataExportLogs.clickFileNameFromTheList(resultFileName);

          const date = new Date();
          const formattedDateUpToHours = date.toISOString().slice(0, 13);

          DataExportLogs.verifyErrorTextInErrorLogsPane(
            new RegExp(`${formattedDateUpToHours}.*ERROR Invalid UUID format: ,`),
          );
        });
      },
    );
  });
});
