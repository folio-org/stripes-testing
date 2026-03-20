import { DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES } from '../../../support/constants';
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
const instanceIds = [];
const numberOfInstances = 20;
const csvFileName = `AT_C350717_instances_${getRandomPostfix()}.csv`;
const instance = { title: `AT_C350717_FolioInstance_${getRandomPostfix()}` };

describe('Data Export', () => {
  describe('Export to MARC', () => {
    before('Create test data', () => {
      cy.createTempUser([
        permissions.inventoryAll.gui,
        permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        permissions.uiUserEdit.gui,
        permissions.uiUsersView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 })
          .then((types) => {
            instanceTypeId = types[0].id;

            // Create instances for first CSV file
            for (let i = 0; i < numberOfInstances; i++) {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: instance.title,
                },
              }).then((createdInstanceData) => {
                instanceIds.push(createdInstanceData.instanceId);
              });
            }
          })
          .then(() => {
            FileManager.createFile(`cypress/fixtures/${csvFileName}`, instanceIds.join('\n'));
          });

        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      instanceIds.forEach((instanceId) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      });

      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}F`);
    });

    it(
      'C350717 Check name of the User triggered data export displayed under “Running“ accordion, "Run by" column (firebird)',
      { tags: ['extendedPath', 'firebird', 'C350717'] },
      () => {
        // Step 1: Go to Data Export app (already landed via login) - verify Jobs pane visible
        DataExportLogs.waitLoading();

        // Step 2: Trigger data export by submitting .csv file with instance UUIDs
        ExportFileHelper.uploadFile(csvFileName);

        // Step 3: Run the instance job profile by clicking on it
        SelectJobProfile.selectJobProfile(DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES.INSTANCES);
        SelectJobProfile.clickRunButton();

        // Step 4: Verify name of the User triggered data export displayed under “Running“ accordion
        DataExportLogs.verifyExportJobInRunningAccordion(csvFileName.replace('.csv', ''), user);
        DataExportLogs.verifyFileExistsInLogs(csvFileName.replace('.csv', ''));

        // Step 5: As soon as the job completes check the "Run by" column for data export job in the "Logs" main page
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('firstJob');
        cy.wait('@firstJob', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          const firstJobId = jobData.hrId;
          const firstResultFileName = `${csvFileName.replace('.csv', '')}-${firstJobId}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            firstResultFileName,
            numberOfInstances,
            firstJobId,
            user.username,
          );
        });
      },
    );
  });
});
