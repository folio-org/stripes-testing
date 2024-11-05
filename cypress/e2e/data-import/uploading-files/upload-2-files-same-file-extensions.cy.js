import { DEFAULT_JOB_PROFILE_NAMES, JOB_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Uploading files', () => {
    let user;
    const filesNames = ['C2378_File1.mrc', 'C2378_File2.MRC'];
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2378 UIDATIMP-252: Uploading 2 files with the same extension, but different case, does not work. (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C2378'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadBunchOfDifferentFiles(filesNames);
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(filesNames[0]);
        Logs.checkJobStatus(filesNames[0], JOB_STATUS_NAMES.COMPLETED);
        Logs.checkJobStatus(filesNames[1], JOB_STATUS_NAMES.COMPLETED);
      },
    );
  });
});
