import TopMenu from '../../../../support/fragments/topMenu';
import testTypes from '../../../../support/dictionary/testTypes';
import permissions from '../../../../support/dictionary/permissions';
import devTeams from '../../../../support/dictionary/devTeams';
import users from '../../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';

let user;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test users', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditQueryView.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, { path: TopMenu.bulkEditPath, waiter: BulkEditSearchPane.waitLoading });
        });
    });

    after('delete test data', () => {
      users.deleteViaApi(user.userId);
    });

    it('C380426 Verify Bulk edit elements in the left pane --In app (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
      BulkEditSearchPane.usersRadioIsDisabled(true);
      BulkEditSearchPane.itemsRadioIsDisabled(false);
      BulkEditSearchPane.itemsHoldingsIsDisabled(false);
      BulkEditSearchPane.openQuerySearch();
      BulkEditSearchPane.verifyQueryPane();
    });
  });
});
