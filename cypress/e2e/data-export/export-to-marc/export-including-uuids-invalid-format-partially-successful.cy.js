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
const csvFileName = `AT_C11082_mixedUUIDs_${getRandomPostfix()}.csv`;
const folioInstanceTitle = `AT_C11082_FolioInstance_${getRandomPostfix()}`;
const marcInstanceTitle = `AT_C11082_MarcInstance_${getRandomPostfix()}`;
const testData = {
  validInstanceIds: [],
  invalidUUIDs: ['invalid-uuid-format-12345', 'another-invalid-uuid-text'],
  allUUIDs: [],
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
            testData.allUUIDs = [...testData.validInstanceIds, ...testData.invalidUUIDs];

            FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.allUUIDs.join('\n'));
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

      // Delete created instances
      testData.validInstanceIds.forEach((instanceId) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      });

      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
    });

    it(
      'C11082 Export including UUIDs in invalid format is partially successful (firebird)',
      { tags: ['extendedPath', 'firebird', 'C11082'] },
      () => {
        // Step 1: Trigger the data export by clicking on the "or choose file" button at jobs panel and submitting .csv file with Instance UUIDs
        ExportFileHelper.uploadFile(csvFileName);
        SelectJobProfile.verifySelectJobPane();
        SelectJobProfile.verifyExistingJobProfiles();
        SelectJobProfile.verifySearchBox();
        SelectJobProfile.verifySearchButton(true);

        // Step 2: Run the Default instances job profile by clicking on it > Specify "instance" type > Click on "Run" button
        ExportFileHelper.exportWithDefaultJobProfile(csvFileName);

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getJobInfo');
        cy.wait('@getJobInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const jobId = jobData.hrId;
          const totalRecordsCount = testData.allUUIDs.length;
          const resultFileName = `${csvFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;

          DataExportResults.verifyCompletedWithErrorsExportResultCells(
            resultFileName,
            totalRecordsCount,
            testData.validInstanceIds.length,
            jobId,
            user,
          );

          cy.getUserToken(user.username, user.password);

          // Step 3: Click on the row with recently completed with errors job at the "Data Export" logs table
          DataExportLogs.clickFileNameFromTheList(resultFileName);

          const date = new Date();
          const formattedDateUpToHours = date.toISOString().slice(0, 13);
          const regexParts = testData.invalidUUIDs.map((invalidUUID) => `(?=.*${invalidUUID})`);
          const regexPattern = `${formattedDateUpToHours}.*ERROR Invalid UUID format: ${regexParts.join('')}`;
          const regex = new RegExp(regexPattern);

          DataExportLogs.verifyErrorTextInErrorLogsPane(regex);
        });
      },
    );
  });
});
