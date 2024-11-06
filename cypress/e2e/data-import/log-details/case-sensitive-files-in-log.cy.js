import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    let instanceId;
    const filePathToUpload = 'oneMarcBib.mrc';
    const fileName = `C423386 Default_file${getRandomPostfix()}.mrc`;

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        DataImport.uploadFileViaApi(
          filePathToUpload,
          fileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          instanceId = response[0].instance.id;
        });

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    it(
      'C423386 Check the case-sensitive files in log (folijet)',
      { tags: ['criticalPath', 'folijet', 'C423386'] },
      () => {
        Logs.openViewAllLogs();
        LogsViewAll.verifyLogsPaneIsOpened();
        ['default_file', 'DEFAULT'].forEach((value) => {
          LogsViewAll.searchByKeyword(value);
          LogsViewAll.verifySearchResult(fileName);
          LogsViewAll.resetAllFilters(false);
        });
      },
    );
  });
});
