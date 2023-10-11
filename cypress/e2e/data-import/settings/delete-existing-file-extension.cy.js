import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';
import Users from '../../../support/fragments/users/users';
import FileExtensionView from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensionView';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    let fileExtensionName;

    before('login and create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);

        FileExtensions.createViaApi().then((response) => {
          fileExtensionName = response.extension;
        });
      });
    });

    after('delete user', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2336 Delete an existing file extension (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const calloutMessage = `The file extension "${fileExtensionName}" was successfully deleted`;

        cy.visit(SettingsMenu.fileExtensionsPath);
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
