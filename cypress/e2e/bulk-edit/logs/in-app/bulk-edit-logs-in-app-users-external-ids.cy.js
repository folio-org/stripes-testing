import testTypes from '../../../../support/dictionary/testTypes';
import devTeams from '../../../../support/dictionary/devTeams';
import permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Users from '../../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import UserEdit from '../../../../support/fragments/users/userEdit';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';

// TO DO: remove ignoring errors. Now when you click on one of the buttons, some promise in the application returns false
Cypress.on('uncaught:exception', () => false);

let user;
const externalId = getRandomPostfix();
const userExternalIDsFileName = `userExternalIDs_${getRandomPostfix()}.csv`;
const matchRecordsFileNameValid = `*Matched-Records-${userExternalIDsFileName}`;
const updatesPreviewFileName = `*Updates-Preview-${userExternalIDsFileName}`;
const updatedRecordsFileName = `modified-*-${matchRecordsFileNameValid}`;

describe('Bulk Edit - Logs', () => {
  before('create test data', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditUpdateRecords.gui,
      permissions.uiUsersView.gui,
      permissions.uiUserEdit.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: TopMenu.usersPath, waiter: UsersSearchPane.waitLoading });
        FileManager.createFile(`cypress/fixtures/${userExternalIDsFileName}`, externalId);
      });
  });

  after('delete test data', () => {
    FileManager.deleteFile(`cypress/fixtures/${userExternalIDsFileName}`);
    FileManager.deleteFolder(Cypress.config('downloadsFolder'));
    Users.deleteViaApi(user.userId);
  });

  it('C375247 Verify genetated Logs files for Users In app -- only valid External IDs (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    UsersSearchPane.searchByStatus('Active');
    UsersSearchPane.searchByUsername(user.username);
    UserEdit.addExternalId(externalId);

    cy.visit(TopMenu.bulkEditPath);
    BulkEditSearchPane.waitLoading();
    BulkEditSearchPane.selectRecordIdentifier('External IDs');

    BulkEditSearchPane.uploadFile(userExternalIDsFileName);
    BulkEditSearchPane.waitFileUploading();

    BulkEditActions.downloadMatchedResults();

    BulkEditActions.openInAppStartBulkEditFrom();
    BulkEditActions.verifyBulkEditForm();
    const newEmailDomain = 'google.com';
    BulkEditActions.replaceEmail('folio.org', newEmailDomain);
    BulkEditActions.confirmChanges();
    BulkEditActions.downloadPreview();
    BulkEditActions.commitChanges();
    BulkEditSearchPane.waitFileUploading();
    BulkEditActions.openActions();
    BulkEditActions.downloadChangedCSV();

    BulkEditSearchPane.openLogsSearch();
    BulkEditSearchPane.verifyLogsPane();
    BulkEditSearchPane.checkUsersCheckbox();
    BulkEditSearchPane.clickActionsRunBy(user.username);
    BulkEditSearchPane.verifyLogsRowActionWhenCompleted();

    BulkEditSearchPane.downloadFileUsedToTrigger();
    BulkEditFiles.verifyCSVFileRows(userExternalIDsFileName, [externalId]);

    BulkEditSearchPane.downloadFileWithMatchingRecords();
    BulkEditFiles.verifyMatchedResultFileContent(matchRecordsFileNameValid, [user.barcode], 'userBarcode', true);

    BulkEditSearchPane.downloadFileWithProposedChanges();
    BulkEditFiles.verifyMatchedResultFileContent(updatesPreviewFileName, [newEmailDomain], 'emailDomain', true);

    BulkEditSearchPane.downloadFileWithUpdatedRecords();
    BulkEditFiles.verifyMatchedResultFileContent(updatedRecordsFileName, [newEmailDomain], 'emailDomain', true);

    cy.visit(TopMenu.usersPath);
    UsersSearchPane.searchByUsername(user.username);
    Users.verifyEmailDomainOnUserDetailsPane(newEmailDomain);
  });
});
