import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';

let user;
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
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
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C359215 Verify date picker plugin for "Expiration date" option (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.username);

        const tomorrowDate = DateTools.getTomorrowDay();
        const nextWeekDate = DateTools.getFutureWeekDateObj();

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillExpirationDate(tomorrowDate);
        BulkEditActions.verifyPickedDate(tomorrowDate);

        BulkEditActions.fillExpirationDate(nextWeekDate);
        BulkEditActions.verifyPickedDate(nextWeekDate);
        BulkEditActions.cancel();
        BulkEditSearchPane.verifyMatchedResults(user.username);

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillExpirationDate(tomorrowDate);
        BulkEditActions.verifyPickedDate(tomorrowDate);
        BulkEditActions.clearPickedDate();
      },
    );
  });
});
