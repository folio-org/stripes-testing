import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtentions/fileExtensions';
import NewFileExtention from '../../../support/fragments/settings/dataImport/fileExtentions/newFileExtention';

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
        FileExtensions.openNewFileExtentionForm();
        NewFileExtention.verifyNewFileExtentionFormIsOpened();
        NewFileExtention.fill(testData);
        NewFileExtention.save();
        NewFileExtention.verifyCalloutMessage(calloutMessage);
        NewFileExtention.verifyPreviouslyPopulatedDataIsNotDisplayed();
        NewFileExtention.verifyNewFileExtentionFormIsOpened();
      },
    );
  });
});
