import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs, { LOGS_LIST_COLUMNS } from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    const randomPostfix = getRandomPostfix();
    const instanceIds = [];
    // Two imports of our own, so the list always has a few rows to sort
    // (the other rows of the landing page belong to whoever ran imports on the env)
    const importFiles = [
      {
        filePath: 'marcBib380433.mrc',
        fileName: `AT_C17145_FileA_${randomPostfix}.mrc`,
      },
      {
        filePath: 'marcBib385656.mrc',
        fileName: `AT_C17145_FileB_${randomPostfix}.mrc`,
      },
    ];
    let user;

    before('Create test user, import files and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataImportDeleteLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        importFiles.forEach(({ filePath, fileName }) => {
          DataImport.uploadFileViaApi(
            filePath,
            fileName,
            DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          ).then((response) => {
            instanceIds.push(response[0].instance.id);
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      instanceIds.forEach((instanceId) => InventoryInstance.deleteInstanceViaApi(instanceId));
      Users.deleteViaApi(user.userId);
    });

    it(
      'C17145 Check the log sort on the Data Import landing page (promin)',
      { tags: ['extendedPath', 'promin', 'C17145'] },
      () => {
        // Step 1: Data Import landing page - the logs of the recent imports are shown
        importFiles.forEach(({ fileName }) => Logs.waitFileIsImported(fileName));

        // Steps 2-17: each column header in the order of the steps - the first click sorts the
        // column ascending, the second click - descending
        Object.values(LOGS_LIST_COLUMNS).forEach((name) => {
          Logs.clickOnLogsListColumnHeader(name);
          Logs.verifyLogsListIsSortedByColumn(name);
          Logs.clickOnLogsListColumnHeader(name);
          Logs.verifyLogsListIsSortedByColumn(name, { descending: true });
        });
      },
    );
  });
});
