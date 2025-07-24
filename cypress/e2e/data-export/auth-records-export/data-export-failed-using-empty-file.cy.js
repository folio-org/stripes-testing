import permissions from '../../../support/dictionary/permissions';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const emptyFile = `emptyFile${getRandomPostfix()}.csv`;

describe('Data Export', () => {
  describe('Authority records export', () => {
    beforeEach('create test data', () => {
      cy.createTempUser([permissions.dataExportUploadExportDownloadFileViewLogs.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          FileManager.createFile(`cypress/fixtures/${emptyFile}`);
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${emptyFile}`);
    });

    it(
      'C353208 Export failed when using empty ".csv" file (Spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C353208'] },
      () => {
        ExportFileHelper.uploadFile(emptyFile);
        ExportFileHelper.exportWithDefaultJobProfile(emptyFile, 'Default authority', 'Authorities');
        DataExportResults.verifyLastLog(emptyFile, 'Fail');
      },
    );
  });
});
