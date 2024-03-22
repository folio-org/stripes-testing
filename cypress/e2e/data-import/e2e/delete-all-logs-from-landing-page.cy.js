/* eslint-disable cypress/no-unnecessary-waiting */
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let user = null;
    const instanceIds = [];
    const filePathToUpload = 'oneMarcBib.mrc';
    const numberOfLogsToDelete = 2;
    const numberOfLogsPerPage = 25;
    const getCalloutSuccessMessage = (logsCount) => `${logsCount} data import logs have been successfully deleted.`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';

    before('create test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataImportDeleteLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        for (let i = 0; i < 26; i++) {
          const fileNameToUpload = `C358137 autotestFile${getRandomPostfix()}.mrc`;

          DataImport.uploadFileViaApi(filePathToUpload, fileNameToUpload, jobProfileToRun).then(
            (response) => {
              instanceIds.push(response.entries[0].relatedInstanceInfo.idList[0]);
            },
          );
        }
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        instanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C358137 A user can delete import logs with "Data import: Can delete import logs" permission on Landing page (folijet)',
      { tags: ['smoke', 'folijet'] },
      () => {
        // need to open file for this we find it
        Logs.openViewAllLogs();
        LogsViewAll.openUserIdAccordion();
        LogsViewAll.filterJobsByUser(`${user.firstName} ${user.lastName}`);
        Logs.openFileDetailsByRowNumber();
        Logs.clickOnHotLink();
        cy.location('pathname').should('include', '/inventory/view');

        cy.visit(TopMenu.dataImportPath);
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
          InteractorsTools.checkCalloutMessage(getCalloutSuccessMessage(numberOfLogsToDelete));
          DataImport.verifyLogsPaneSubtitleAbsent();
          DataImport.verifyDataImportLogsDeleted(logsHrIdsToBeDeleted);
          DataImport.verifyDeleteLogsButtonDisabled();
          cy.reload();
          DataImport.checkMultiColumnListRowsCount(numberOfLogsPerPage);
        });
      },
    );
  });
});
