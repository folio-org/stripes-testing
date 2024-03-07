import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const invalidUserUUID = getRandomPostfix();

describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.uiUsersView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(
          `cypress/fixtures/${userUUIDsFileName}`,
          `${user.userId}\r\n${invalidUserUUID}`,
        );
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C350928 Verify error accordion during matching (Local approach) (firebird)',
      { tags: ['smoke', 'firebird'] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');

        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyMatchedResults(user.username);
        BulkEditSearchPane.verifyNonMatchedResults(invalidUserUUID);

        BulkEditSearchPane.verifyActionsAfterConductedCSVUploading();
        BulkEditSearchPane.verifyUsersActionShowColumns();

        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Email');
        BulkEditSearchPane.verifyResultColumTitles('Email');

        BulkEditSearchPane.verifyErrorLabel(userUUIDsFileName, 1, 1);
      },
    );
  });
});
