import permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import getRandomPostfix from '../../../../support/utils/stringTools';
import FileManager from '../../../../support/utils/fileManager';
import BulkEditLogs from '../../../../support/fragments/bulk-edit/bulk-edit-logs';

let user;
let userForTesting;
const names = {
  first: 'firstName',
  middle: 'middle',
  preferred: 'preferred',
};
const userUUIDsFileName = `userUUIDs-${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('Logs', () => {
    describe('Csv approach', () => {
      before('create test data', () => {
        cy.createTempUser([permissions.bulkEditCsvEdit.gui, permissions.uiUserEdit.gui]).then(
          (userProperties) => {
            userForTesting = userProperties;
            cy.login(userForTesting.username, userForTesting.password, {
              path: TopMenu.bulkEditPath,
              waiter: BulkEditSearchPane.waitLoading,
            });

            cy.getUsers({ limit: 1, query: `username=${userForTesting.username}` }).then(
              (users) => {
                cy.updateUser({
                  ...users[0],
                  personal: {
                    lastName: userForTesting.lastName,
                    email: 'test@folio.org',
                    preferredContactTypeId: '002',
                  },
                });
              },
            );
            FileManager.createFile(
              `cypress/fixtures/${userUUIDsFileName}`,
              `${userForTesting.userId}`,
            );
            BulkEditSearchPane.checkUsersRadio();
            BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
            BulkEditSearchPane.uploadFile(userUUIDsFileName);
            BulkEditSearchPane.waitFileUploading();
          },
        );
        cy.createTempUser([
          permissions.bulkEditLogsView.gui,
          permissions.bulkEditCsvView.gui,
          permissions.bulkEditView.gui,
          permissions.uiUsersView.gui,
          permissions.uiUserEdit.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
        Users.deleteViaApi(user.userId);
        Users.deleteViaApi(userForTesting.userId);
      });

      it(
        'C380628 Verify how User\'s names are displayed in "Run by" column of Bulk edit Logs (firebird) (TaaS)',
        { tags: ['extendedPath', 'firebird', 'C380628'] },
        () => {
          BulkEditSearchPane.openLogsSearch();
          BulkEditLogs.verifyLogsPane();
          BulkEditLogs.checkUsersCheckbox();
          BulkEditLogs.verifyActionsRunBy(userForTesting.lastName);

          cy.getUsers({ limit: 1, query: `username=${userForTesting.username}` }).then((users) => {
            cy.updateUser({
              ...users[0],
              personal: {
                ...users[0].personal,
                firstName: names.first,
              },
            });
          });
          cy.reload();
          BulkEditLogs.verifyActionsRunBy(`${userForTesting.lastName}, ${names.first}`);

          cy.getUsers({ limit: 1, query: `username=${userForTesting.username}` }).then((users) => {
            cy.updateUser({
              ...users[0],
              personal: {
                ...users[0].personal,
                middleName: names.middle,
              },
            });
          });
          cy.reload();
          BulkEditLogs.verifyActionsRunBy(
            `${userForTesting.lastName}, ${names.first} ${names.middle}`,
          );

          cy.getUsers({ limit: 1, query: `username=${userForTesting.username}` }).then((users) => {
            cy.updateUser({
              ...users[0],
              personal: {
                ...users[0].personal,
                preferredFirstName: names.preferred,
              },
            });
          });
          cy.reload();
          BulkEditLogs.verifyActionsRunBy(
            `${userForTesting.lastName}, ${names.preferred} ${names.middle}`,
          );
        },
      );
    });
  });
});
