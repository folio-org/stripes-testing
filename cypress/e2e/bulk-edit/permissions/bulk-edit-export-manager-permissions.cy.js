import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import ExportManagerSearchPane from '../../../support/fragments/exportManager/exportManagerSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

let user;

const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${userUUIDsFileName}`;

describe('Permissions Bulk Edit', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
      permissions.uiUsersView.gui,
      permissions.uiUsersPermissions.gui,
      permissions.uiUserEdit.gui,
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
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
    FileManager.deleteFileFromDownloadsByMask(matchedRecordsFileName);
  });

  it('C353978 Verify that user can view data in Export Manager based on permissions (Negative) (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
    cy.visit(TopMenu.exportManagerPath);
    ExportManagerSearchPane.searchByBulkEdit();
    ExportManagerSearchPane.selectJob(user.username);
    ExportManagerSearchPane.clickJobIdInThirdPane();

    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByUsername(user.username);
    UsersSearchPane.waitLoading();
    UserEdit.addPermissions([
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
      permissions.uiUsersView.gui,
      permissions.uiUsersPermissions.gui,
      permissions.uiUserEdit.gui,
    ]);
    UserEdit.saveAndClose();
    UserEdit.addPermissions([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
    ]);
    UserEdit.saveAndClose();

    cy.login(user.username, user.password, {
      path: TopMenu.exportManagerPath,
      waiter: ExportManagerSearchPane.waitLoading
    });
    ExportManagerSearchPane.searchByBulkEdit();
    ExportManagerSearchPane.selectJob(user.username);
    ExportManagerSearchPane.verifyJobIdInThirdPaneHasNoLink();
  });
});
