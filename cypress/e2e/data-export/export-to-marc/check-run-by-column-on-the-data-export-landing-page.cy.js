import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let instanceTypeId;
let secondJobId;
const numberOfInstances = 1;
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

        cy.getInstanceTypes({ limit: 1 }).then((types) => {
          instanceTypeId = types[0].id;
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: instance.title,
            },
          }).then((createdInstanceData) => {
            instance.uuid = createdInstanceData.instanceId;

            FileManager.createFile(`cypress/fixtures/${csvFileName}`, instance.uuid);
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.uuid);
      Users.deleteViaApi(user.userId);
      cy.deleteDataExportJobExecutionFromLogs(secondJobId).then((response) => {
        expect(response.status).to.equal(204);
      });
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
    });

    it(
      'C350717 Check "Run by" column on the Data Export landing page (firebird)',
      { tags: ['extendedPath', 'firebird', 'C350717'] },
      () => {
        // Step 1: Go to Data Export app (already landed via login) - verify Jobs pane visible
        DataExportLogs.waitLoading();

        // Step 2: Trigger data export by submitting .csv file with instance UUIDs
        ExportFileHelper.uploadFile(csvFileName);
        ExportFileHelper.exportWithDefaultJobProfile(csvFileName);

        // Step 3-4: Run instance job profile & wait for completion; verify file created
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

        cy.getUserToken(user.username, user.password);

        // Step 5: Modify user profile - clear First name (UI step represented via API for efficiency)
        cy.getUsers({ query: `username==${user.username}` }).then((usersFound) => {
          const fullUserRecord = usersFound[0];
          fullUserRecord.personal.firstName = '';
          cy.updateUser(fullUserRecord).then(() => {
            cy.getUsers({ query: `username==${user.username}` }).then((editedUser) => {
              expect(editedUser[0].personal.firstName).to.equal('');
            });
          });

          // Step 6-7: Trigger another export with the same CSV file
          ExportFileHelper.uploadFile(csvFileName);
          ExportFileHelper.exportWithDefaultJobProfile(csvFileName);

          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('secondJob');
          cy.wait('@secondJob', getLongDelay()).then(({ response }) => {
            const { jobExecutions } = response.body;
            const secondJobData = jobExecutions
              .filter(({ runBy }) => runBy.userId === user.userId)
              .sort((a, b) => b.hrId - a.hrId)[0];
            const secondJobHrid = secondJobData.hrId;
            secondJobId = secondJobData.id;
            const secondResultFileName = `${csvFileName.replace('.csv', '')}-${secondJobHrid}.mrc`;

            DataExportResults.verifySuccessExportResultCells(
              secondResultFileName,
              numberOfInstances,
              secondJobHrid,
              user.username,
            );
          });
        });
      },
    );
  });
});
