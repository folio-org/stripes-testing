import { Permissions } from '../../../support/dictionary';
import { RECORD_STATUSES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Permissions', () => {
    let user;
    let instnaceId;
    const fileName = `oneMarcBib.mrc${getRandomPostfix()}`;

    before('create test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        'oneMarcBib.mrc',
        fileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        instnaceId = response[0].instance.id;
      });

      cy.createTempUser([
        Permissions.settingsDataImportView.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.remoteStorageView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(instnaceId);
      });
    });

    it(
      'C356780 A user can view logs but can not import files with "Data import: Can view only" permission (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.searchWithTerm(fileName);
        LogsViewAll.openFileDetails(fileName);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstances.verifyInstanceDetailsView();
      },
    );
  });
});
