import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import SettingsDataImport from '../../../support/fragments/data_import/settingsDataImport';
import Users from '../../../support/fragments/users/users';

describe('Log details', () => {
  let user;
  const nameMarcFileForCreate = `C357019 autotestFile.${getRandomPostfix()}.mrc`;

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.moduleDataImportEnabled.gui,
      Permissions.settingsDataImportCanViewOnly.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(user.userId);
    });
  });

  it(
    'C357019 Check that no error when going to the "Uploading jobs" and "Settings/Job profiles" pages from the "View All" page (folijet) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.folijet] },
    () => {
      // #1 Go to "Data import" app -> click on "Actions" button -> Select the "View all"
      // User is taken to the View all logs screen
      Logs.actionsButtonClick();
      Logs.viewAllLogsButtonClick();
      LogsViewAll.viewAllIsOpened();

      // #2 Click the "Data import" button in breadcrumbs -> import any "*.mrc" file
      // You will be brought to the Job profiles view with your file listed in the left pane and available job profiles in the right pane
      TopMenuNavigation.navigateToApp('Data import');
      DataImport.waitLoading();
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile('marcFileForC17017.mrc', nameMarcFileForCreate);
      JobProfiles.waitLoadingList();
      JobProfiles.verifyFileListArea(nameMarcFileForCreate);
      // need to wait until file will be uploaded
      cy.wait(3000);

      // #3 Click the "Data import" button in breadcrumbs -> click on "Actions" button -> Select the "View all"
      // User is taken to the View all logs screen
      TopMenuNavigation.navigateToApp('Data import');
      DataImport.waitLoading();
      Logs.actionsButtonClick();
      Logs.viewAllLogsButtonClick();
      LogsViewAll.viewAllIsOpened();

      // #4 Click the Settings page from Apps -> select "Data import" -> select "Job profiles"
      // Job profiles are displayed in the 3rd pane, and there is no Action menu
      TopMenuNavigation.navigateToApp('Settings');
      SettingsDataImport.goToSettingsDataImport();
      DataImport.selectDataImportProfile('Job profiles');
      JobProfiles.waitLoadingList();
      JobProfiles.verifyActionMenuAbsent();
    },
  );
});
