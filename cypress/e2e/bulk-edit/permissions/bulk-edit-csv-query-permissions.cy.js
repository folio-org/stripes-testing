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
      ]).then((userProperties) => {
        userWithProfileView = userProperties;
      });
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditUpdateRecords.gui,
        permissions.bulkEditQueryView.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(userWithProfileView.userId);
    });

    it(
      'C366072 Verify Bulk edit elements in the left pane -- Users Local & In app (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Logs', 'Query');
        BulkEditSearchPane.verifyRecordIdentifierEmpty();
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);

        // Without waiter, user is not logging in
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(2000);
        cy.login(userWithProfileView.username, userWithProfileView.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Logs', 'Query');
        BulkEditSearchPane.isUsersRadioChecked(false);
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
      },
    );
  });
});
