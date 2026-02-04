import { Permissions } from '../../../support/dictionary';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

let user;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create user', () => {
      cy.createTempUser([
        Permissions.bulkEditView.gui,
        Permissions.bulkEditEdit.gui,
        Permissions.bulkEditCsvEdit.gui,
        Permissions.bulkEditCsvView.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiUsersView.gui,
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
    });

    it(
      'C895643 Verify radio buttons on the Record types accordion (Firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C895643'] },
      () => {
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Logs', 'Query');
        BulkEditSearchPane.verifyRecordIdentifierEmpty();
        // "Identifier" tab is highlighted by default
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');

        // "Inventory - holdings" non-selected
        BulkEditSearchPane.isHoldingsRadioChecked(false);
        // "Inventory - items" non-selected
        BulkEditSearchPane.isItemsRadioChecked(false);
        // "Users" non-selected
        BulkEditSearchPane.isUsersRadioChecked(false);

        BulkEditSearchPane.verifyRecordIdentifierEmpty();
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);

        // Click "Select record identifier" dropdown
        BulkEditSearchPane.verifyRecordTypeIdentifiers('Users');
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);

        // Click the "Inventory - items" radio button
        BulkEditSearchPane.verifyRecordTypeIdentifiers('Items');
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
      },
    );
  });
});
