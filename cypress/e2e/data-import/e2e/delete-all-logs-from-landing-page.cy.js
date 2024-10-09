/* eslint-disable cypress/no-unnecessary-waiting */
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let user = null;
    const instanceIds = [];
    const filePathToUpload = 'oneMarcBib.mrc';
    const numberOfLogsToDelete = 2;
    const numberOfLogsPerPage = 25;
    const getCalloutSuccessMessage = (logsCount) => `${logsCount} data import logs have been successfully deleted.`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;

    before('Create test data and login', () => {
      cy.getAdminToken();
      for (let i = 0; i < 1; i++) {
        const fileNameToUpload = `C358137 autotestFile${getRandomPostfix()}.mrc`;

        DataImport.uploadFileViaApi(filePathToUpload, fileNameToUpload, jobProfileToRun).then(
          (response) => {
            instanceIds.push(response[0].instance.id);
          },
        );
      }
      cy.createTempUser([
        Permissions.dataImportDeleteLogs.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        for (let i = 0; i < 1; i++) {
          const fileNameToUpload = `C358137 autotestFile${getRandomPostfix()}.mrc`;

          DataImport.uploadFileViaApi(filePathToUpload, fileNameToUpload, jobProfileToRun).then(
            (response) => {
              instanceIds.push(response[0].instance.id);
            },
          );
        }
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        instanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C358137 A user can delete import logs with "Data import: Can delete import logs" permission on Landing page (folijet)',
      { tags: ['smokeFlaky', 'folijet'] },
      () => {
        // need to open file for this we find it
        Logs.openViewAllLogs();
        cy.wait(8000);
        LogsViewAll.openUserIdAccordion();
        LogsViewAll.filterJobsByUser(`${user.firstName} ${user.lastName}`);
        Logs.openFileDetailsByRowNumber();
        Logs.clickOnHotLink();
        cy.location('pathname').should('include', '/inventory/view');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        TopMenuNavigation.clickToGoHomeButton();
        DataImport.getLogsHrIdsFromUI(numberOfLogsToDelete).then((logsHrIdsToBeDeleted) => {
          // verify that user can cancel deletion of logs
          DataImport.selectAllLogs();
          DataImport.verifyAllLogsCheckedStatus({ logsCount: numberOfLogsPerPage, checked: true });
          DataImport.verifyLogsPaneSubtitleExist(numberOfLogsPerPage);
          DataImport.openDeleteImportLogsModal();
          DataImport.cancelDeleteImportLogs();
          DataImport.verifyAllLogsCheckedStatus({ logsCount: numberOfLogsPerPage, checked: false });
          DataImport.verifyLogsPaneSubtitleAbsent();
          DataImport.verifyDeleteLogsButtonDisabled();

          // verify that user can delete logs
          new Array(numberOfLogsToDelete).fill(null).forEach((_, index) => {
            DataImport.selectLog(index);
          });
          DataImport.verifyLogsPaneSubtitleExist(numberOfLogsToDelete);
          DataImport.openActionsMenu();
          DataImport.openDeleteImportLogsModal();
          DataImport.confirmDeleteImportLogs();
          cy.wait(1000);
          InteractorsTools.checkCalloutMessage(getCalloutSuccessMessage(numberOfLogsToDelete));
          DataImport.verifyLogsPaneSubtitleAbsent();
          cy.wait(2000);
          DataImport.verifyDataImportLogsDeleted(logsHrIdsToBeDeleted);
          DataImport.verifyDeleteLogsButtonDisabled();
          cy.reload();
          DataImport.checkMultiColumnListRowsCount(numberOfLogsPerPage);
        });
      },
    );
  });
});
