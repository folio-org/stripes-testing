import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathForUpload = ['marcBibFileForC353957_102.mrc', 'marcBibFileForC353957_202.mrc'];
    const fileNames = [
      `marcBibFileForC353957_102_${getRandomPostfix()}.mrc`,
      `marcBibFileForC353957_202_${getRandomPostfix()}.mrc`,
    ];
    const numberOfRecords = ['102', '202'];

    before('create user and login', () => {
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

    after('delete user', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C353957 When new Data Import log summary is opened, old UI from previous log summary is displayed (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload[1], fileNames[1]);
        DataImport.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.checkFileIsRunning(fileNames[1]);
        JobProfiles.waitFileIsImported(fileNames[1]);
        Logs.openFileDetails(fileNames[1]);
        FileDetails.verifyHeader(fileNames[1], numberOfRecords[1]);
        FileDetails.paginateThroughAllPages(2);
        FileDetails.close();
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload[0], fileNames[0]);
        DataImport.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.checkFileIsRunning(fileNames[0]);
        Logs.openFileDetails(fileNames[0]);
        FileDetails.verifyHeader(fileNames[0], numberOfRecords[0]);
        FileDetails.paginateThroughAllPages(1);
      },
    );
  });
});
