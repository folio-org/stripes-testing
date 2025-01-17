import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FileExtensionView from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensionView';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    let fileExtensionName;

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);

        FileExtensions.createViaApi().then((response) => {
          fileExtensionName = response.extension;
        });
      });
    });

    after('Delete test user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2336 Delete an existing file extension (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C2336'] },
      () => {
        const calloutMessage = `The file extension "${fileExtensionName}" was successfully deleted`;

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FILE_EXTENSIONS);
        FileExtensions.verifyListOfExistingFileExtensionsIsDisplayed();
        FileExtensions.select(fileExtensionName);
        FileExtensionView.verifyDetailsViewIsOpened();
        FileExtensionView.delete(fileExtensionName);
        FileExtensions.verifyCalloutMessage(calloutMessage);
        FileExtensions.verifyDeletedFileExtensionAbsent(fileExtensionName);
      },
    );
  });
});
