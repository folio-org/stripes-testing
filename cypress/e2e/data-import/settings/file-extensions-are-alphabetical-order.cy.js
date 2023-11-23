import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';
import Users from '../../../support/fragments/users/users';
import FileExtensionView from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensionView';
import NewFileExtension from '../../../support/fragments/settings/dataImport/fileExtensions/newFileExtension';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const testData = {
      fileExtension: '.fod',
      importStatus: 'Block import',
    };

    before('login and create test data', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.settingsDataImportView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('delete user', () => {
      cy.getAdminToken();
      FileExtensionView.delete(testData.fileExtension);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C15851 Make sure the file extension settings are in alphabetical order when a new one is added (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
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
