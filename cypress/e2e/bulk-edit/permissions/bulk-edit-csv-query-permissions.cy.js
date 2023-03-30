import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';

let user;
let userWithProfileView;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test users', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditUpdateRecords.gui,
        permissions.bulkEditQueryView.gui,
        permissions.uiUsersView.gui,
      ])
        .then(userProperties => {
          userWithProfileView = userProperties;
        });
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditUpdateRecords.gui,
        permissions.bulkEditQueryView.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading
          });
        });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(userWithProfileView.userId);
    });

    it('C366072 Verify Bulk edit elements in the left pane -- Users CSV & In app (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Query');
      BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
      BulkEditSearchPane.usersRadioIsDisabled(false);
      BulkEditSearchPane.isUsersRadioChecked();
      BulkEditSearchPane.itemsRadioIsDisabled(true);
      BulkEditSearchPane.itemsHoldingsIsDisabled(true);
      BulkEditSearchPane.isDragAndDropAreaDisabled(true);

      BulkEditSearchPane.openQuerySearch();
      BulkEditSearchPane.verifySpecificTabHighlighted('Query');
      BulkEditSearchPane.usersRadioIsDisabled(true);
      BulkEditSearchPane.itemsRadioIsDisabled(true);
      BulkEditSearchPane.itemsHoldingsIsDisabled(true);
      BulkEditSearchPane.isBuildQueryButtonDisabled(true);

      // Need to wait for verification to complete
      cy.wait(2000);
      cy.login(userWithProfileView.username, userWithProfileView.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading
      });
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Query');
      BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
      BulkEditSearchPane.usersRadioIsDisabled(false);
      BulkEditSearchPane.isUsersRadioChecked();
      BulkEditSearchPane.itemsRadioIsDisabled(true);
      BulkEditSearchPane.itemsHoldingsIsDisabled(true);
      BulkEditSearchPane.isDragAndDropAreaDisabled(true);

      BulkEditSearchPane.openQuerySearch();
      BulkEditSearchPane.verifySpecificTabHighlighted('Query');
      BulkEditSearchPane.usersRadioIsDisabled(true);
      BulkEditSearchPane.itemsRadioIsDisabled(true);
      BulkEditSearchPane.itemsHoldingsIsDisabled(true);
      BulkEditSearchPane.isBuildQueryButtonDisabled(false);
    });
  });
});
