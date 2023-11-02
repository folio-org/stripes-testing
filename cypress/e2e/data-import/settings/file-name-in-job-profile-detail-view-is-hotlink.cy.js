import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import Users from '../../../support/fragments/users/users';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const filePathToUpload = 'oneMarcBib.mrc';
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const fileNameToUpload = `C380637autotestFile.${getRandomPostfix()}.mrc`;

    before('create test data', () => {
      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });

      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.waitLoading();
      DataImport.uploadFile(filePathToUpload, fileNameToUpload);
      JobProfiles.search(jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileNameToUpload);
      cy.logout();

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('delete user', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C380637 Job profile: verify that file name in job profile detail view is a hotlink for job log details (folijet)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.checkListOfExistingProfilesIsDisplayed();
        JobProfiles.search(jobProfileToRun);
        JobProfileView.verifyJobProfileOpened();
        JobProfileView.verifyJobsUsingThisProfileSection(fileNameToUpload);
        JobProfileView.openLogDetailsPageView(fileNameToUpload);
        FileDetails.verifyLogDetailsPageIsOpened(fileNameToUpload);
      },
    );
  });
});
