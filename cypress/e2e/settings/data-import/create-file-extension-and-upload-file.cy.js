import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileExtensionView from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensionView';
import FileExtensions from '../../../support/fragments/settings/dataImport/fileExtensions/fileExtensions';
import NewFileExtension from '../../../support/fragments/settings/dataImport/fileExtensions/newFileExtension';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('Delete test user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2328 Create a file extension for a blocked file type and ensure that file type cannot be uploaded (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C2328'] },
      () => {
        const filePath = 'file.txt';
        const fileName = `C2328 autotestFile.${getRandomPostfix()}.txt`;
        const testData = {
          fileExtension: '.txt',
          importStatus: 'Block import',
        };

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FILE_EXTENSIONS);
        FileExtensions.verifyListOfExistingFileExtensionsIsDisplayed();
        FileExtensions.openNewFileExtensionForm();
        NewFileExtension.verifyNewFileExtensionFormIsOpened();
        NewFileExtension.fill(testData);
        NewFileExtension.save();
        FileExtensionView.verifyDetailsViewIsOpened();
        FileExtensions.verifyCreateFileExtensionPresented(testData.fileExtension);
        FileExtensions.verifyCreatedFileExtension(testData.fileExtension, 'Block import');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePath, fileName);
        DataImport.verifyImportBlockedModal();
        DataImport.cancelBlockedImportModal();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FILE_EXTENSIONS);
        FileExtensions.select(testData.fileExtension);
        FileExtensionView.delete(testData.fileExtension);
      },
    );

    it(
      'C2329 Create a file extension for an acceptable file type and upload a file (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C2329'] },
      () => {
        const filePath = 'file.csv';
        const fileName = `C2329 autotestFile.${getRandomPostfix()}.csv`;
        const testData = {
          fileExtension: '.csv',
          dataType: 'MARC',
        };

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FILE_EXTENSIONS);
        FileExtensions.verifyListOfExistingFileExtensionsIsDisplayed();
        FileExtensions.openNewFileExtensionForm();
        NewFileExtension.verifyNewFileExtensionFormIsOpened();
        NewFileExtension.fill(testData);
        NewFileExtension.save();
        FileExtensionView.verifyDetailsViewIsOpened();
        FileExtensions.verifyCreateFileExtensionPresented(testData.fileExtension);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePath, fileName);
        DataImport.verifyFileIsImported(fileName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FILE_EXTENSIONS);
        FileExtensions.select(testData.fileExtension);
        FileExtensionView.delete(testData.fileExtension);
      },
    );
  });
});
