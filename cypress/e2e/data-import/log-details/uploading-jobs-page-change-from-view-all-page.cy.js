import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    const nameMarcFileForCreate = `C357019 autotestFile${getRandomPostfix()}.mrc`;

    before('Create test user and login', () => {
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

    after('Delete user', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C357019 Check that no error when going to the "Uploading jobs" and "Settings/Job profiles" pages from the "View All" page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C357019'] },
      () => {
        // #1 Go to "Data import" app -> click on "Actions" button -> Select the "View all"
        // User is taken to the View all logs screen
        Logs.actionsButtonClick();
        Logs.viewAllLogsButtonClick();
        LogsViewAll.viewAllIsOpened();

        // #2 Click the "Data import" button in breadcrumbs -> import any "*.mrc" file
        // You will be brought to the Job profiles view with your file listed in the left pane and available job profiles in the right pane
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.waitLoading();
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.waitLoadingList();
        JobProfiles.verifyFileListArea(nameMarcFileForCreate);
        JobProfiles.waitFileIsUploaded();

        // #3 Click the "Data import" button in breadcrumbs -> click on "Actions" button -> Select the "View all"
        // User is taken to the View all logs screen
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.waitLoading();
        Logs.actionsButtonClick();
        Logs.viewAllLogsButtonClick();
        LogsViewAll.viewAllIsOpened();

        // #4 Click the Settings page from Apps -> select "Data import" -> select "Job profiles"
        // Job profiles are displayed in the 3rd pane, and there is no Action menu
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.waitLoadingList();
        JobProfiles.verifyActionMenuAbsent();
      },
    );
  });
});
