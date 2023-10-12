import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';
import { TestTypes, DevTeams, Permissions } from '../../../support/dictionary';

let user;

describe('bulk-edit', () => {
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
    Users.deleteViaApi(user.userId);
  });

  it(
    'C350670 Verify radio buttons on the Record types accordion (Firebird) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.firebird] },
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
      BulkEditSearchPane.verifyRecordIdentifierItems();
      BulkEditSearchPane.isDragAndDropAreaDisabled(true);

      // Click the "Inventory - items" radio button
      BulkEditSearchPane.verifyItemIdentifiers();
      BulkEditSearchPane.isDragAndDropAreaDisabled(true);
    },
  );
});
