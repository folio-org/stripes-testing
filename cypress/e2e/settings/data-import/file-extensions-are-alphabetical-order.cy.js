import { Permissions } from '../../../support/dictionary';
import FileExtensionView from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensionView';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';
import NewFileExtension from '../../../support/fragments/settings/dataImport/fileExtensions/newFileExtension';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const testData = {
      fileExtension: '.fod',
      importStatus: 'Block import',
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.settingsDataImportView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        FileExtensionView.delete(testData.fileExtension);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C15851 Make sure the file extension settings are in alphabetical order when a new one is added (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C15851'] },
      () => {
        SettingsDataImport.goToSettingsDataImport();
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FILE_EXTENSIONS);
        cy.visit(SettingsMenu.fileExtensionsPath);
        FileExtensions.verifyListOfExistingFileExtensionsIsDisplayed();
        FileExtensions.verifyListIsSortedInAlphabeticalOrder();
        FileExtensions.openNewFileExtensionForm();
        NewFileExtension.fill(testData);
        NewFileExtension.save();
        FileExtensions.verifyListIsSortedInAlphabeticalOrder();
      },
    );
  });
});
