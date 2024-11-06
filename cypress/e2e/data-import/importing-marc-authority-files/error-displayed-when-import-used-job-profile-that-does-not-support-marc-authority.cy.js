import {
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    let user;
    const filePathForUpload = 'marcAuthFileForC359246.mrc';
    const title = 'Iroquois people Treaties';
    const marcFiles = [
      {
        fileName: `C359246 marcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        errorMessage:
          "Chosen job profile 'Default - Create instance and SRS MARC Bib' does not support 'MARC_AUTHORITY' record type",
      },
      {
        fileName: `C359246 marcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
        errorMessage:
          "Chosen job profile 'Default - Create Holdings and SRS MARC Holdings' does not support 'MARC_AUTHORITY' record type",
      },
    ];

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C359246 Checking the error displayed when the import used a "Job Profile" that does not support the "MARC Authority" record (folijet)',
      { tags: ['extendedPath', 'folijet', 'C359246'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, marcFiles[0].fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(marcFiles[0].jobProfileToRun);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFiles[0].fileName);
        Logs.checkJobStatus(marcFiles[0].fileName, JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(marcFiles[0].fileName);
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
        JsonScreenView.verifyContentInTab(marcFiles[0].errorMessage);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, marcFiles[1].fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(marcFiles[1].jobProfileToRun);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFiles[1].fileName);
        Logs.openFileDetails(marcFiles[1].fileName);
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
        JsonScreenView.verifyContentInTab(marcFiles[1].errorMessage);
      },
    );
  });
});
