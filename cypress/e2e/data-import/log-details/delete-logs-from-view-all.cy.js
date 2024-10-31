import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import DeleteDataImportLogsModal from '../../../support/fragments/data_import/logs/deleteDataImportLogsModal';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const maxLogsQuantityOnPage = 100;

describe('Data Import', () => {
  describe('Log details', () => {
    const instanceIds = [];

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.dataImportDeleteLogs.gui]).then((userProperties) => {
        user = userProperties;

        for (let i = 0; i < 70; i++) {
          const fileName = `C367923 autotestFileName${getRandomPostfix()}.mrc`;

          DataImport.uploadFileViaApi(
            'oneMarcBib.mrc',
            fileName,
            DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          ).then((response) => {
            instanceIds.push(response[0].instance.id);
          });
          cy.wait(2000);
        }

        cy.login(userProperties.username, userProperties.password, {
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

    // TODO added tag broken FAT-12393
    it(
      'C367923 A user can delete logs from the Import app "View all" page (folijet)',
      { tags: ['criticalPathBroken', 'folijet', 'C367923'] },
      () => {
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.selectAllLogs();
        LogsViewAll.checkIsLogsSelected(maxLogsQuantityOnPage);
        LogsViewAll.deleteLog();
        DeleteDataImportLogsModal.cancelDelete(maxLogsQuantityOnPage);
        LogsViewAll.checkmarkAllLogsIsRemoved();

        LogsViewAll.selectAllLogs();
        LogsViewAll.checkIsLogsSelected(maxLogsQuantityOnPage);
        LogsViewAll.deleteLog();
        DeleteDataImportLogsModal.confirmDelete(maxLogsQuantityOnPage);
        LogsViewAll.verifyMessageOfDeleted(maxLogsQuantityOnPage);
        LogsViewAll.modalIsAbsent();
      },
    );
  });
});
