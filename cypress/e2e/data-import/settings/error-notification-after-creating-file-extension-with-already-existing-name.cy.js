import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';
import NewFileExtension from '../../../support/fragments/settings/dataImport/fileExtensions/newFileExtension';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const testData = {
      fileExtension: '.dat',
      dataType: 'MARC',
    };
    const calloutMessage = `File extension ${testData.fileExtension} already exists`;

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C410707 Verify error notification after creating file extension with already existing name (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        cy.visit(SettingsMenu.fileExtensionsPath);
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
