import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';

let user;

describe('Data Export', () => {
  describe('Export to MARC', () => {
    beforeEach('create test data', () => {
      cy.createTempUser([permissions.dataExportUploadExportDownloadFileViewLogs.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.dataExportPath,
            waiter: DataExportLogs.waitLoading,
          });
        },
      );
    });

    it(
      'C9292 Negative test - invalid file extension (firebird)',
      { tags: ['extendedPath', 'firebird'] },
      () => {
        ExportFileHelper.uploadFile('example.json');
        ExportFileHelper.verifyWarningWithInvalidFileExtension();
        ExportFileHelper.clickCancelButton();
      },
    );
  });
});
