import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import BulkEditFiles from '../../../support/fragments/bulk-edit/bulk-edit-files';

let user;

const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${userUUIDsFileName}`;

describe('Permissions Bulk Edit', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
      permissions.bulkEditEdit.gui,
      permissions.bulkEditView.gui,
      permissions.uiUsersView.gui,
      permissions.exportManagerAll.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading
        });
      })
      .then(() => {
        FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        cy.visit(TopMenu.exportManagerPath);
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
    FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
  });

  it('C353969 Export manager -- Verify that user can view data in Export Manager based on permissions (Local approach) (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    ExportManagerSearchPane.waitLoading();
    ExportManagerSearchPane.searchByBulkEdit();
    ExportManagerSearchPane.selectJob(user.username);
    ExportManagerSearchPane.clickJobIdInThirdPane();

    BulkEditFiles.verifyMatchedResultFileContent(matchedRecordsFileName, [user.userId], 'userId', true);
  });
});
