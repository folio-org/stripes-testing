import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';

let user;
let userWithProfileView;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
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
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(userWithProfileView.userId);
    });

    it(
      'C366072 Verify Bulk edit elements in the left pane -- Users Local & In app (firebird)',
      { tags: ['criticalPath', 'firebird', 'shiftLeft', 'C366072'] },
      () => {
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Query');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Logs');
        BulkEditSearchPane.verifyRecordIdentifierEmpty();
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);

        // Without waiter, user is not logging in
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(2000);
        cy.login(userWithProfileView.username, userWithProfileView.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Query');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Logs');
        BulkEditSearchPane.isUsersRadioChecked(false);
        ['Inventory - holdings', 'Inventory - instances', 'Inventory - items'].forEach(
          (identifier) => BulkEditSearchPane.verifyRadioHidden(identifier),
        );
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
      },
    );
  });
});
