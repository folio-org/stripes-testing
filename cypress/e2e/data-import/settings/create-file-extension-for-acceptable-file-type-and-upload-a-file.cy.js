import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtentions/fileExtensions';
import NewFileExtention from '../../../support/fragments/settings/dataImport/fileExtentions/newFileExtention';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const testData = {
      fileExtension: '.txt',
      dataType: 'MARC',
    };

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    it(
      'C2329 Create a file extension for an acceptable file type and upload a file (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        cy.visit(SettingsMenu.fileExtensionsPath);
        FileExtensions.verifyListOfExistingFileExtensionsIsDisplayed();
        FileExtensions.openNewFileExtentionForm();
        NewFileExtention.verifyNewFileExtentionFormIsOpened();
        NewFileExtention.fill(testData);
        NewFileExtention.save();
      },
    );
  });
});
