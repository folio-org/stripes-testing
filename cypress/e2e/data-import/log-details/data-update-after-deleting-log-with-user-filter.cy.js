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

describe('Data Import', () => {
  describe('Uploading files', () => {
    let user = {};
    let instanceId;
    const filesPath = 'C2378_File1.mrc';
    const fileName = `C358540 autoTest${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataImportDeleteLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        DataImport.uploadFileViaApi(filesPath, fileName, jobProfileToRun).then((response) => {
          instanceId = response[0].instance.id;
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C358540 Check the data update in the User filter after deleting the logs on the View all page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C358540'] },
      () => {
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.openUserIdAccordion();
        LogsViewAll.filterJobsByUser(`${user.firstName} ${user.lastName}`);
        cy.wait(2000); // need wait because will select all logs without waiting filtered logs
        LogsViewAll.selectAllLogs();
        LogsViewAll.deleteLog();
        DeleteDataImportLogsModal.confirmDelete(1);
        LogsViewAll.verifyMessageOfDeleted(1);
        LogsViewAll.noLogResultsFound();
      },
    );
  });
});
