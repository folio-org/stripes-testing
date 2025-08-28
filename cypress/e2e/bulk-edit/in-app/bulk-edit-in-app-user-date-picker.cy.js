import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui]).then(
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

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C359215 Verify date picker plugin for "Expiration date" option (firebird)',
      { tags: ['criticalPath', 'firebird', 'C359215'] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.username);

        const tomorrowDate = DateTools.getTomorrowDay();
        const nextWeekDate = DateTools.getFutureWeekDateObj();

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.fillExpirationDate(tomorrowDate);
        BulkEditActions.verifyPickedDate(tomorrowDate);

        BulkEditActions.fillExpirationDate(nextWeekDate);
        BulkEditActions.verifyPickedDate(nextWeekDate);
        BulkEditActions.cancel();
        BulkEditSearchPane.verifyMatchedResults(user.username);

        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.fillExpirationDate(tomorrowDate);
        BulkEditActions.verifyPickedDate(tomorrowDate);
        BulkEditActions.clearPickedDate();
      },
    );
  });
});
