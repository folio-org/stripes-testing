import { Permissions } from '../../../support/dictionary';
import FileExtensionView from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensionView';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';

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
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2336 Delete an existing file extension (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
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
