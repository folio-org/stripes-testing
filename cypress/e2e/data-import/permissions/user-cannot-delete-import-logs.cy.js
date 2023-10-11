import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import Users from '../../../support/fragments/users/users';
import { JOB_STATUS_NAMES } from '../../../support/constants';

describe('data-import', () => {
  describe('Permissions', () => {
    let user;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const fileName = `C353641 autotestFile.${getRandomPostfix()}.mrc`;

    before('create test data', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C353641 A user can not delete import logs with standard Data import: Can upload files, import, and view logs permission (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', fileName);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
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
