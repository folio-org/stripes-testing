import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Importing MARC Holdings files', () => {
    let user;
    let instanceHrid;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathForUpload = 'oneMarcBib.mrc';
    const fileWithHoldingsPathForUpload = 'marcBibFileForC359218.mrc';
    const fileName = `C359218 autotestFileName.${getRandomPostfix()}`;
    const editedMarcFileName = `C359218 editedMarcFile.${getRandomPostfix()}.mrc`;
    const errorMessage =
      '{"error":"A new MARC-Holding was not created because the incoming record already contained a 999ff$s or 999ff$i field"}';

    before('create test data', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      // upload a marc file for creating of the new instance, holding and item
      DataImport.uploadFile(filePathForUpload, fileName);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.openFileDetails(fileName);
      FileDetails.openInstanceInInventory('Created');
      InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
        instanceHrid = initialInstanceHrId;
      });
      cy.logout();

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.settingsTenantViewLocation.gui,
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
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C359218 Checking import to Create MARC Holdings records when incoming records have 999 ff fields (folijet)',
      { tags: ['extendedPath', 'folijet', 'nonParallel'] },
      () => {
        // edit marc file adding instance hrid
        DataImport.editMarcFile(
          fileWithHoldingsPathForUpload,
          editedMarcFileName,
          ['intest1', 'intest2', 'intest3'],
          [instanceHrid, instanceHrid, instanceHrid],
        );
        // upload a marc file for creating holdings
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search('Default - Create Holdings and SRS MARC Holdings');
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(editedMarcFileName);
        Logs.openFileDetails(editedMarcFileName);
        FileDetails.checkStatusInColumn(
          FileDetails.status.noAction,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.openJsonScreen('Holdings');
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyContentInTab(errorMessage);
      },
    );
  });
});
