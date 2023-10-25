import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';
import Users from '../../../support/fragments/users/users';
import FileExtensionView from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensionView';

describe('data-import: Settings', () => {
  let user;
  const fileExtensionName = '.foc';

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
    FileExtensionView.delete(fileExtensionName);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C15851 Make sure the file extension settings are in alphabetical order when a new one is added (folijet) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.folijet] },
    () => {
      cy.visit(SettingsMenu.fileExtensionsPath);
      FileExtensions.verifyListOfExistingFileExtensionsIsDisplayed();
      FileExtensions.verifyListIsSortedInAlphabeticalOrder();
      FileExtensions.creatNewFileExtension(fileExtensionName);
      FileExtensions.verifyListIsSortedInAlphabeticalOrder();
    },
  );
});
