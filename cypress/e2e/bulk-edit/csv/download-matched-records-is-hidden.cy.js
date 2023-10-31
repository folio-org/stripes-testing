import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../support/dictionary/devTeams';
import getRandomPostfix from '../../../support/utils/stringTools';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';

describe('Bulk Edit - Items', () => {
  let user;
  const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
  const invalidUserUUID = getRandomPostfix();

  before('Create test data', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.uiInventoryViewCreateEditDeleteItems.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password);

      FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, invalidUserUUID);
    });
  });

  after('Delete test data', () => {
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
  });

  it(
    'C353545 Verify that Download matched records is hidden in case Errors only (firebird) (TaaS)',
    { tags: [testTypes.extendedPath, devTeams.firebird] },
    () => {
      // Navigate to the Bulk edit app => Select Inventory-Items
      cy.visit(TopMenu.bulkEditPath);
      BulkEditSearchPane.waitLoading();
      //  Select "Item UUIDs" from the "Select record identifier" dropdown
      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.isDragAndDropAreaDisabled(true);
      BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');
      BulkEditSearchPane.isDragAndDropAreaDisabled(false);
      // Upload a .csv file with Items UUIDs (see Preconditions) by dragging it on the file drag and drop area
      BulkEditSearchPane.uploadFile(userUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();
      // Click the "Actions" menu
      BulkEditActions.openActions();
      BulkEditActions.downloadErrorsExists();
      // Click the "Download errors (CSV)" button
      BulkEditActions.downloadErrors();
    },
  );
});
