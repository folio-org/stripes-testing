import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Permissions', () => {
    let user;
    let instanceHrid;
    const fileName = `C356780 fileName${getRandomPostfix()}.mrc`;
    const filePathToUpload = 'oneMarcBib.mrc';
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';

    before('create test data', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(filePathToUpload, fileName);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);

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
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C356780 A user can view logs but can not import files with "Data import: Can view only" permission (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        DataImport.verifyChooseFileButtonState({ isDisabled: true });
        Logs.openFileDetails(fileName);
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((hrId) => {
          instanceHrid = hrId;
        });
        InventoryInstances.verifyInstanceDetailsView();
        cy.visit(TopMenu.dataImportPath);
        Logs.openViewAllLogs();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.searchWithTerm(fileName);
        LogsViewAll.openFileDetails(fileName);
        FileDetails.openInstanceInInventory('Created');
        InventoryInstances.verifyInstanceDetailsView();
      },
    );
  });
});
