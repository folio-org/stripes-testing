import { Permissions } from '../../../support/dictionary';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';
import NewFileExtension from '../../../support/fragments/settings/dataImport/fileExtensions/newFileExtension';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const testData = {
      fileExtension: '.dat',
      dataType: 'MARC',
    };
    const calloutMessage = `File extension ${testData.fileExtension} already exists`;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C410707 Verify error notification after creating file extension with already existing name (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        SettingsDataImport.goToSettingsDataImport();
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FILE_EXTENSIONS);
        FileExtensions.openNewFileExtensionForm();
        NewFileExtension.verifyNewFileExtensionFormIsOpened();
        NewFileExtension.fill(testData);
        NewFileExtension.save();
        NewFileExtension.verifyCalloutMessage(calloutMessage);
        NewFileExtension.verifyPreviouslyPopulatedDataIsNotDisplayed();
        NewFileExtension.verifyNewFileExtensionFormIsOpened();
      },
    );
  });
});
