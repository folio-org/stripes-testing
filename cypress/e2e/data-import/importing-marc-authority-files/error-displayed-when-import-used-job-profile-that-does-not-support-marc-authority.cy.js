import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import getRandomPostfix from '../../../support/utils/stringTools';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import { JOB_STATUS_NAMES, RECORD_STATUSES } from '../../../support/constants';

describe('data-import', () => {
  describe('Importing MARC Authority files', () => {
    let user;
    const filePathForUpload = 'marcAuthFileForC359246.mrc';
    const title = 'Iroquois people Treaties';
    const marcFiles = [
      {
        fileName: `C359246 marcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        errorMessage:
          "io.vertx.core.impl.NoStackTraceThrowable: Chosen job profile 'Default - Create instance and SRS MARC Bib' does not support 'MARC_AUTHORITY' record type",
      },
      {
        fileName: `C359246 marcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create Holdings and SRS MARC Holdings',
        errorMessage:
          "io.vertx.core.impl.NoStackTraceThrowable: Chosen job profile 'Default - Create Holdings and SRS MARC Holdings' does not support 'MARC_AUTHORITY' record type",
      },
    ];

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C359246 Checking the error displayed when the import used a "Job Profile" that does not support the "MARC Authority" record (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, marcFiles[0].fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(marcFiles[0].jobProfileToRun);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFiles[0].fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
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

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, marcFiles[1].fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(marcFiles[1].jobProfileToRun);
        JobProfiles.selectJobProfile();
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFiles[1].fileName);
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
