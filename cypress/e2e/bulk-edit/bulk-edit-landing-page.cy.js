import TopMenu from '../../support/fragments/topMenu';
import permissions from '../../support/dictionary/permissions';
import BulkEditSearchPane, {
  userIdentifiers,
  itemIdentifiers,
  instanceIdentifiers,
  holdingsIdentifiers,
} from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../support/fragments/users/users';
import BulkEditLogs from '../../support/fragments/bulk-edit/bulk-edit-logs';

let user;

describe('Bulk-edit', () => {
  before('create user', () => {
    cy.createTempUser([
      permissions.bulkEditLogsView.gui,
      permissions.bulkEditCsvEdit.gui,
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditEdit.gui,
      permissions.bulkEditUpdateRecords.gui,
      permissions.bulkEditView.gui,
      permissions.bulkEditQueryView.gui,
      permissions.uiInventoryViewInstances.gui,
      permissions.uiInventoryViewCreateEditHoldings.gui,
      permissions.uiInventoryViewCreateEditItems.gui,
      permissions.uiUserCanAssignUnassignPermissions.gui,
      permissions.uiUserEdit.gui,
      permissions.uiUsersPermissionsView.gui,
      permissions.uiUsersView.gui,
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
    'C350929 Verify Bulk Edit app - landing page (firebird)',
    { tags: ['smoke', 'firebird', 'C350929'] },
    () => {
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs', 'Query');
      BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');

      // verify panes
      BulkEditSearchPane.verifyRecordTypesSortedAlphabetically();
      BulkEditSearchPane.verifyPanesBeforeImport();
      BulkEditSearchPane.verifyBulkEditPaneItems();
      BulkEditSearchPane.verifySetCriteriaPaneItems();
      BulkEditSearchPane.verifyRecordTypesAccordion();
      BulkEditSearchPane.verifyResetAllButtonDisabled();
      BulkEditSearchPane.verifySelectRecordIdentifierRequired(false);
      BulkEditSearchPane.verifyFirstOptionRecordIdentifierDropdown('Select record identifier');

      // verify identifier items
      BulkEditSearchPane.verifyRecordTypeIdentifiers('Users');
      userIdentifiers.forEach((identifier) => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', identifier);
        BulkEditSearchPane.verifyResetAllButtonDisabled(false);
        BulkEditSearchPane.verifySelectRecordIdentifierRequired(true);
      });

      BulkEditSearchPane.verifyRecordTypeIdentifiers('Items');
      BulkEditSearchPane.clickRecordTypesAccordion();
      BulkEditSearchPane.verifyRecordTypesAccordionCollapsed();
      BulkEditSearchPane.clickRecordTypesAccordion();
      itemIdentifiers.forEach((identifier) => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', identifier);
        BulkEditSearchPane.verifyResetAllButtonDisabled(false);
        BulkEditSearchPane.verifySelectRecordIdentifierRequired(true);
      });

      BulkEditSearchPane.verifyRecordTypeIdentifiers('Instances');
      instanceIdentifiers.forEach((identifier) => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instances', identifier);
        BulkEditSearchPane.verifyResetAllButtonDisabled(false);
        BulkEditSearchPane.verifySelectRecordIdentifierRequired(true);
      });

      BulkEditSearchPane.verifyRecordTypeIdentifiers('Holdings');
      holdingsIdentifiers.forEach((identifier) => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', identifier);
        BulkEditSearchPane.verifyResetAllButtonDisabled(false);
        BulkEditSearchPane.verifySelectRecordIdentifierRequired(true);
      });

      // verify logs items
      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs', 'Query');
      BulkEditSearchPane.verifySpecificTabHighlighted('Logs');
      BulkEditLogs.verifyLogsPane();
      BulkEditLogs.verifyRecordTypesSortedAlphabetically();

      // Click "Identifier" toggle in buttons group
      BulkEditSearchPane.openIdentifierSearch();
      BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
      BulkEditSearchPane.isHoldingsRadioChecked(true);
      BulkEditSearchPane.verifyFirstOptionRecordIdentifierDropdown('Item barcodes');
      BulkEditSearchPane.isDragAndDropAreaDisabled(false);

      // Click "Reset all" button
      BulkEditSearchPane.clickResetAllButton();
      BulkEditSearchPane.verifyDefaultFilterState();

      // Check the "Set criteria" left side pane after reset
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs', 'Query');
      BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
      BulkEditSearchPane.verifyRecordTypesSortedAlphabetically();
      BulkEditSearchPane.verifyPanesBeforeImport();
      BulkEditSearchPane.verifyBulkEditPaneItems();
      BulkEditSearchPane.verifySetCriteriaPaneItems();
      BulkEditSearchPane.verifyRecordTypesAccordion();
      BulkEditSearchPane.verifyResetAllButtonDisabled();
      BulkEditSearchPane.verifySelectRecordIdentifierRequired(false);
      BulkEditSearchPane.verifyFirstOptionRecordIdentifierDropdown('Select record identifier');

      // Check the "Bulk edit" main pane
      BulkEditSearchPane.verifyBulkEditImage();
      BulkEditSearchPane.verifyBulkEditPaneItems();
      BulkEditSearchPane.verifyDefaultFilterState();
    },
  );
});
