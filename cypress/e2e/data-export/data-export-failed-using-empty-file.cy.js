import permissions from '../../support/dictionary/permissions';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
const emptyFile = `emptyFile${getRandomPostfix()}.csv`;

describe('data-export', () => {
  describe('Authority records export', () => {
    beforeEach('create test data', () => {
      cy.createTempUser([
        permissions.dataExportAll.gui,
        permissions.dataExportEnableModule.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
        cy.visit(TopMenu.dataExportPath);
        FileManager.createFile(`cypress/fixtures/${emptyFile}`);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${emptyFile}`);
    });

    it(
      'C353208 Export failed when using empty ".csv" file (Spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        ExportFileHelper.uploadFile(emptyFile);
        ExportFileHelper.exportWithDefaultJobProfile(emptyFile, 'authority', 'Authorities');
        DataExportResults.verifyLastLog(emptyFile, 'Fail');
      },
    );
  });
});
