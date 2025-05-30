import { DEFAULT_JOB_PROFILE_NAMES, JOB_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Permissions', () => {
    let user;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const fileName = `C353641 autotestFile${getRandomPostfix()}.mrc`;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C353641 A user can not delete import logs with standard Data import: Can upload files, import, and view logs permission (folijet)',
      { tags: ['criticalPath', 'folijet', 'C353641'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.verifyCheckboxForMarkingLogsAbsent();
        Logs.actionsButtonClick();
        Logs.verifyDeleteSelectedLogsButtonAbsent();
        Logs.viewAllLogsButtonClick();
        LogsViewAll.viewAllIsOpened();
        LogsViewAll.verifyCheckboxForMarkingLogsAbsent();
      },
    );
  });
});
