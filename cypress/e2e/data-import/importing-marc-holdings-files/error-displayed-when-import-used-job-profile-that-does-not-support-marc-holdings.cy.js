import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Importing MARC Holdings files', () => {
    let user;
    let instanceHrid;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathForUpload = 'oneMarcBib.mrc';
    const fileNameForCreateInstance = `C359245 autotestFileName${getRandomPostfix()}.mrc`;
    const fileNameForImportForMarcAuthority = `C359245 autotestFileName${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C359245 editedMarcFile${getRandomPostfix()}.mrc`;
    const title = 'Holdings';
    const errorMessageForMarcAuthorityProfile =
      "Chosen job profile 'Default - Create SRS MARC Authority' does not support 'MARC_HOLDING' record type";
    const errorMessageForInstanceProfile =
      "Chosen job profile 'Default - Create instance and SRS MARC Bib' does not support 'MARC_HOLDING' record type";

    before('create test data', () => {
      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
      DataImport.uploadFile(filePathForUpload, fileNameForCreateInstance);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileNameForCreateInstance);
      Logs.openFileDetails(fileNameForCreateInstance);
      FileDetails.openInstanceInInventory('Created');
      InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
        instanceHrid = initialInstanceHrId;
      });
      cy.logout();

      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
      DataImport.editMarcFile(
        'marcBibFileForC359245.mrc',
        editedMarcFileName,
        ['ina0000000002'],
        [instanceHrid],
      );
    });

    after('delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    });

    it(
      'C359245 Checking the error displayed when the import used a "Job Profile" that does not support the "MARC Holding" record type (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, fileNameForImportForMarcAuthority);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search('Default - Create SRS MARC Authority');
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileNameForImportForMarcAuthority);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(fileNameForImportForMarcAuthority);
        FileDetails.verifyLogDetailsPageIsOpened(fileNameForImportForMarcAuthority);
        FileDetails.checkStatusInColumn(
          FileDetails.status.noAction,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          FileDetails.status.error,
          FileDetails.columnNameInResultList.error,
        );
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyContentInTab(errorMessageForMarcAuthorityProfile);

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(editedMarcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(editedMarcFileName);
        FileDetails.verifyLogDetailsPageIsOpened(editedMarcFileName);
        FileDetails.checkStatusInColumn(
          FileDetails.status.noAction,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          FileDetails.status.error,
          FileDetails.columnNameInResultList.error,
        );
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyContentInTab(errorMessageForInstanceProfile);
      },
    );
  });
});
