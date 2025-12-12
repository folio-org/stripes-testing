import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const filePathForUpload = ['marcBibFileForC353957_102.mrc', 'marcBibFileForC353957_202.mrc'];
    const fileNames = [
      `C353957 marcBibFile_102_${getRandomPostfix()}.mrc`,
      `C353957 marcBibFile_202_${getRandomPostfix()}.mrc`,
    ];
    const numberOfRecords = ['102', '202'];

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportCanViewOnly.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
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
      'C353957 When new Data Import log summary is opened, old UI from previous log summary is displayed (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C353957'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload[1], fileNames[1]);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        cy.wait(60000);
        Logs.waitFileIsImported(fileNames[1]);
        Logs.openFileDetails(fileNames[1]);
        FileDetails.verifyHeader(fileNames[1], numberOfRecords[1]);
        FileDetails.paginateThroughAllPages(2);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload[0], fileNames[0]);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        cy.wait(30000);
        Logs.waitFileIsImported(fileNames[0]);
        Logs.openFileDetails(fileNames[0]);
        FileDetails.verifyHeader(fileNames[0], numberOfRecords[0]);
        FileDetails.paginateThroughAllPages(1);
      },
    );
  });
});
