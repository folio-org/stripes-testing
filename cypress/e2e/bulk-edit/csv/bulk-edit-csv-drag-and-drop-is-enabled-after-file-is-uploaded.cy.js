import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';

describe('bulk-edit', () => {
  const testData = {};
  const validUserUUIDsFileName = 'user_uuid_valC353540.csv';

  before('Create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      Permissions.bulkEditCsvView.gui,
      Permissions.bulkEditCsvEdit.gui,
      Permissions.uiUsersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C353540 Verify that the "Drag and Drop" is enabled after file is uploaded (firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
    () => {
      BulkEditSearchPane.verifyDefaultFilterState();
      BulkEditSearchPane.checkUsersRadio();
      BulkEditSearchPane.isDragAndDropAreaDisabled(true);

      BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
      BulkEditSearchPane.isDragAndDropAreaDisabled(false);
      BulkEditSearchPane.uploadFile(validUserUUIDsFileName);
      BulkEditSearchPane.waitFileUploading();

      BulkEditSearchPane.verifyResultColumTitles('Username');
      BulkEditSearchPane.isDragAndDropAreaDisabled(true);

      BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
      BulkEditSearchPane.matchedAccordionIsAbsent();
      BulkEditSearchPane.isDragAndDropAreaDisabled(false);
    },
  );
});
