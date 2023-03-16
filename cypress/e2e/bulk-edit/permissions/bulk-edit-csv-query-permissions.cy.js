import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';

let user;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test users', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditUpdateRecords.gui,
        permissions.bulkEditQueryView.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, { path: TopMenu.bulkEditPath, waiter: BulkEditSearchPane.waitLoading });
        });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
    });

    it('C380425 Verify Bulk edit elements in the left pane -- Users CSV & In app (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
      BulkEditSearchPane.usersRadioIsDisabled(false);
      BulkEditSearchPane.itemsRadioIsDisabled(true);
      BulkEditSearchPane.itemsHoldingsIsDisabled(true);
      BulkEditSearchPane.openQuerySearch();
      BulkEditSearchPane.verifyQueryPane();
      BulkEditSearchPane.usersRadioIsDisabled(true);
      BulkEditSearchPane.itemsRadioIsDisabled(true);
      BulkEditSearchPane.itemsHoldingsIsDisabled(true);
      BulkEditSearchPane.searchBtnIsDisabled(true);
      BulkEditSearchPane.resetAllBtnIsDisabled(true);
    });
  });
});
