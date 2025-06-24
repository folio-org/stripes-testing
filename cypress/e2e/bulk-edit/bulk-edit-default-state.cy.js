import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';

let user;

describe('Bulk-edit', () => {
  before('Create test data', () => {
    cy.createTempUser([
      Permissions.bulkEditEdit.gui,
      Permissions.inventoryCRUDHoldings.gui,
      Permissions.uiInventoryViewCreateEditDeleteItems.gui,
      Permissions.bulkEditView.gui,
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
    'C374177 Verify default state switching between record types (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird', 'C374177'] },
    () => {
      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.verifyFirstOptionRecordIdentifierDropdown('Select record identifier');
      BulkEditSearchPane.isDragAndDropAreaDisabled(true);
      BulkEditSearchPane.verifyBulkEditPaneItems();
      BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');

      BulkEditSearchPane.checkHoldingsRadio();
      BulkEditSearchPane.isHoldingsRadioChecked(true);
      BulkEditSearchPane.verifyBulkEditPaneItems();
      BulkEditSearchPane.isDragAndDropAreaDisabled(true);

      BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Instance HRIDs');
      BulkEditSearchPane.isDragAndDropAreaDisabled(false);

      BulkEditSearchPane.checkItemsRadio();
      BulkEditSearchPane.verifyFirstOptionRecordIdentifierDropdown('Select record identifier');
      BulkEditSearchPane.isDragAndDropAreaDisabled(true);
      BulkEditSearchPane.verifyBulkEditPaneItems();
    },
  );
});
