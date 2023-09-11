import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
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
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      Users.deleteViaApi(user.userId);
    });

    afterEach('open new bulk-edit form', () => {
      cy.visit(TopMenu.bulkEditPath);
    });

    it(
      'C357578 Verify "In app - Edit user records" permission (firebird)',
      { tags: [testTypes.smoke, devTeams.firebird] },
      () => {
        BulkEditSearchPane.verifyUsersUpdatePermission();
        BulkEditSearchPane.verifyRecordIdentifierItems();
        BulkEditSearchPane.verifyDragNDropUpdateUsersArea();

        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();

        BulkEditSearchPane.selectRecordIdentifier('External IDs');
        BulkEditSearchPane.verifyDragNDropExternalIDsArea();

        BulkEditSearchPane.selectRecordIdentifier('Usernames');
        BulkEditSearchPane.verifyDragNDropUsernamesArea();
      },
    );

    it(
      'C359197 Verify that User can change the columns in the "Preview of record matched" (firebird)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.verifyDragNDropUsersUUIDsArea();
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.username);

        BulkEditSearchPane.verifyActionsAfterConductedCSVUploading(false);
        BulkEditSearchPane.verifyUserBarcodesResultAccordion();
        BulkEditSearchPane.verifyUsersActionShowColumns();

        BulkEditSearchPane.changeShowColumnCheckbox('Last name');
        BulkEditSearchPane.verifyResultColumTitlesDoNotInclude('Last name');

        BulkEditSearchPane.changeShowColumnCheckbox('Email');
        BulkEditSearchPane.verifyResultColumTitles('Email');
      },
    );
  });
});
