import { JOB_STATUS_NAMES, RECORD_STATUSES } from '../../../support/constants';
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
    const fileNameForCreateInstance = `C359245 autotestFileName.${getRandomPostfix()}`;
    const fileNameForImportForMarcAuthority = `C359245 autotestFileName.${getRandomPostfix()}`;
    const editedMarcFileName = `C359245 editedMarcFile.${getRandomPostfix()}.mrc`;
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
      Logs.waitFileIsImported(fileNameForCreateInstance);
      Logs.openFileDetails(fileNameForCreateInstance);
      FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
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
        Logs.waitFileIsImported(fileNameForImportForMarcAuthority);
        Logs.checkJobStatus(
          fileNameForImportForMarcAuthority,
          JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS,
        );
        Logs.openFileDetails(fileNameForImportForMarcAuthority);
        FileDetails.verifyLogDetailsPageIsOpened();
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.NO_ACTION,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.ERROR,
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
        Logs.waitFileIsImported(editedMarcFileName);
        Logs.checkJobStatus(editedMarcFileName, JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(editedMarcFileName);
        FileDetails.verifyLogDetailsPageIsOpened();
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.NO_ACTION,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.ERROR,
          FileDetails.columnNameInResultList.error,
        );
        FileDetails.verifyLogDetailsPageIsOpened();
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyContentInTab(errorMessageForInstanceProfile);
      },
    );
  });
});
