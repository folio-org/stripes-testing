import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Holdings files', () => {
    let user;
    let instanceHrid;
    let instanceId;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const filePathForUpload = 'oneMarcBib.mrc';
    const fileNameForCreateInstance = `C359245 autotestFileName${getRandomPostfix()}.mrc`;
    const fileNameForImportForMarcAuthority = `C359245 autotestFileName${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C359245 editedMarcFile${getRandomPostfix()}.mrc`;
    const title = 'Holdings';
    const errorMessageForMarcAuthorityProfile =
      "Chosen job profile 'Default - Create SRS MARC Authority' does not support 'MARC_HOLDING' record type";
    const errorMessageForInstanceProfile =
      "Chosen job profile 'Default - Create instance and SRS MARC Bib' does not support 'MARC_HOLDING' record type";

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        DataImport.uploadFileViaApi(
          filePathForUpload,
          fileNameForCreateInstance,
          jobProfileToRun,
        ).then((response) => {
          instanceHrid = response[0].instance.hrid;
          instanceId = response[0].instance.id;
        });

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

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    it(
      'C359245 Checking the error displayed when the import used a "Job Profile" that does not support the "MARC Holding" record type (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, fileNameForImportForMarcAuthority);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForImportForMarcAuthority);
        Logs.checkJobStatus(
          fileNameForImportForMarcAuthority,
          JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS,
        );
        Logs.openFileDetails(fileNameForImportForMarcAuthority);
        FileDetails.verifyLogDetailsPageIsOpened(fileNameForImportForMarcAuthority);
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

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(editedMarcFileName);
        Logs.checkJobStatus(editedMarcFileName, JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(editedMarcFileName);
        FileDetails.verifyLogDetailsPageIsOpened(editedMarcFileName);
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
        JsonScreenView.verifyContentInTab(errorMessageForInstanceProfile);
      },
    );
  });
});
