import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Uploading files', () => {
    let user;
    const firstUploadFile = `C2357 autotestFile.${getRandomPostfix()}.mrc`;
    const secondUploadFile = `C2357 autotestFile.${getRandomPostfix()}.csv`;

    before('create test data', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${firstUploadFile}`);
      FileManager.deleteFile(`cypress/fixtures/${secondUploadFile}`);
    });

    it(
      'C2357 Upload 2 files with different file extensions (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadBunchOfFilesWithDifferentFileExtensions(
          'oneMarcBib.mrc',
          'file.csv',
          firstUploadFile,
          secondUploadFile,
        );
        DataImport.verifyInconsistentFileExtensionsModal();
      },
    );
  });
});
