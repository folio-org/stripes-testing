import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    const instanceIds = [];
    const numberOfLogsToDelete = 5;
    const numberOfLogsPerPage = 25;
    // a full page has to remain after the deletion
    const minNumberOfLogs = numberOfLogsPerPage + numberOfLogsToDelete;
    const importsPerToken = 10;
    const getCalloutSuccessMessage = (logsCount) =>
      `${logsCount} data import logs have been successfully deleted.`;

    before('Create test data, user and login', () => {
      cy.getAdminToken();
      // Precondition: enough imports on the environment - import only the missing ones
      Logs.getLandingPageLogsTotalCountViaApi().then((logsCount) => {
        for (let i = logsCount; i < minNumberOfLogs + 2; i++) {
          // refresh the admin token every 10 imports - the imports take long
          if (i > logsCount && (i - logsCount) % importsPerToken === 0) cy.getAdminToken(false);
          DataImport.uploadFileViaApi(
            'oneMarcBib.mrc',
            `C356825 autotestFile${getRandomPostfix()}.mrc`,
            DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          ).then((response) => {
            instanceIds.push(response[0].instance.id);
          });
        }
      });

      cy.createTempUser([Permissions.dataImportDeleteLogs.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        instanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C356825 The "select all" button does not select all logs after deleting multiple logs from the DI landing page (promin) (TaaS)',
      { tags: ['extendedPath', 'promin', 'C356825', 'nonParallel'] },
      () => {
        DataImport.checkMultiColumnListRowsCount(numberOfLogsPerPage);
        new Array(numberOfLogsToDelete).fill(null).forEach((_, index) => {
          cy.wait(1000);
          DataImport.selectLog(index);
        });
        DataImport.verifyLogsPaneSubtitleExist(numberOfLogsToDelete);
        DataImport.openDeleteImportLogsModal();
        DataImport.confirmDeleteImportLogs();
        InteractorsTools.checkCalloutMessage(getCalloutSuccessMessage(numberOfLogsToDelete));
        DataImport.checkMultiColumnListRowsCount(numberOfLogsPerPage);
        DataImport.selectAllLogs();
        DataImport.verifyLogsPaneSubtitleExist(numberOfLogsPerPage);
      },
    );
  });
});
