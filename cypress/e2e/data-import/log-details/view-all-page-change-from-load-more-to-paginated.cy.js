import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    const instanceIds = [];

    before('create user and login', () => {
      cy.getAdminToken();
      for (let i = 0; i < 101; i++) {
        const fileName = `C353589 autotestFileName${getRandomPostfix()}.mrc`;

        DataImport.uploadFileViaApi(
          'oneMarcBib.mrc',
          fileName,
          'Default - Create instance and SRS MARC Bib',
        ).then((response) => {
          instanceIds.push(response.relatedInstanceInfo.idList[0]);
        });
      }

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C353589 For the Data Import View all page, change from Load more to Paginated (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.verifyPreviousPagination();
        LogsViewAll.clickNextPaginationButton();
        LogsViewAll.verifyNextPagination();
        LogsViewAll.clickPreviousPaginationButton();
        LogsViewAll.verifyPreviousPagination();
      },
    );
  });
});
