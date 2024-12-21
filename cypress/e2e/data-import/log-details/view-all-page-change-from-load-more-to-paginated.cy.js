import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
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
    const instanceIds = [];

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        for (let i = 0; i < 2; i++) {
          const fileName = `C353589 autotestFileName${getRandomPostfix()}.mrc`;

          DataImport.uploadFileViaApi(
            'oneMarcBib.mrc',
            fileName,
            DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          ).then((response) => {
            instanceIds.push(response[0].instance.id);
          });
          cy.wait(2000);
        }

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C353589 For the Data Import View all page, change from Load more to Paginated (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C353589'] },
      () => {
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.getNumberOfLogs().then((number) => {
          const numberOfLogs = number;

          LogsViewAll.verifyPreviousPagination();
          LogsViewAll.clickNextPaginationButton();
          LogsViewAll.verifyNextPagination(numberOfLogs);
          LogsViewAll.clickPreviousPaginationButton();
          LogsViewAll.verifyPreviousPagination();
        });
      },
    );
  });
});
