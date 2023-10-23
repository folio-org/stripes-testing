import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';
import NewFileExtension from '../../../support/fragments/settings/dataImport/fileExtensions/newFileExtension';
import FileExtensionView from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensionView';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';

describe('data-import', () => {
  describe('Settings', () => {
    let user;

    before('create user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2328 Create a file extension for a blocked file type and ensure that file type cannot be uploaded (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const filePath = 'fileForC2328.txt';
        const fileName = `C2328 autotestFile.${getRandomPostfix()}.txt`;
        const testData = {
          fileExtension: '.txt',
          importStatus: 'Block import',
        };

        cy.visit(SettingsMenu.fileExtensionsPath);
        FileExtensions.verifyListOfExistingFileExtensionsIsDisplayed();
        FileExtensions.openNewFileExtensionForm();
        NewFileExtension.verifyNewFileExtensionFormIsOpened();
        NewFileExtension.fill(testData);
        NewFileExtension.save();
        FileExtensionView.verifyDetailsViewIsOpened();
        FileExtensions.verifyCreateFileExtensionPresented(testData.fileExtension);
        FileExtensions.verifyCreatedFileExtension(testData.fileExtension, 'Block import');

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePath, fileName);
        DataImport.verifyImportBlockedModal();

        cy.visit(SettingsMenu.fileExtensionsPath);
        FileExtensions.select(testData.fileExtension);
        FileExtensionView.delete(testData.fileExtension);
      },
    );

    it(
      'C2329 Create a file extension for an acceptable file type and upload a file (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const filePath = 'file.csv';
        const fileName = `C2329 autotestFile.${getRandomPostfix()}.csv`;
        const testData = {
          fileExtension: '.csv',
          dataType: 'MARC',
        };

        cy.visit(SettingsMenu.fileExtensionsPath);
        FileExtensions.verifyListOfExistingFileExtensionsIsDisplayed();
        FileExtensions.openNewFileExtensionForm();
        NewFileExtension.verifyNewFileExtensionFormIsOpened();
        NewFileExtension.fill(testData);
        NewFileExtension.save();
        FileExtensionView.verifyDetailsViewIsOpened();
        FileExtensions.verifyCreateFileExtensionPresented(testData.fileExtension);

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePath, fileName);
        DataImport.verifyFileIsImported(fileName);

        cy.visit(SettingsMenu.fileExtensionsPath);
        FileExtensions.select(testData.fileExtension);
        FileExtensionView.delete(testData.fileExtension);
      },
    );
  });
});
