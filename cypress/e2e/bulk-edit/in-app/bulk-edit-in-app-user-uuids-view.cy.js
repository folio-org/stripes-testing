import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditUpdateRecords.gui, permissions.uiUsersView.gui]).then(
        (userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, user.userId);
        },
      );
    });

    beforeEach('select User', () => {
      BulkEditSearchPane.checkUsersRadio();
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      Users.deleteViaApi(user.userId);
    });

    afterEach('open new bulk-edit form', () => {
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
    });

    it(
      'C357578 Verify "In app - Edit user records" permission (firebird)',
      { tags: ['smoke', 'firebird', 'C357578'] },
      () => {
        BulkEditSearchPane.verifyUsersUpdatePermission();
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'External IDs');

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'Usernames');
      },
    );

    it(
      'C359197 Verify that User can change the columns in the "Preview of record matched" (firebird)',
      { tags: ['extendedPath', 'firebird', 'C359197'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.username);

        BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);
        BulkEditSearchPane.verifyUserBarcodesResultAccordion();
        BulkEditSearchPane.verifyUsersActionShowColumns();

        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Last name');
        BulkEditSearchPane.changeShowColumnCheckbox('Last name');
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude('Last name');

        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Email');
        BulkEditSearchPane.verifyResultColumnTitles('Email');
      },
    );
  });
});
