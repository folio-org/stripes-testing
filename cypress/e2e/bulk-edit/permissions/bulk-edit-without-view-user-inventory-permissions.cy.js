import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane, {
  userIdentifiers,
  itemIdentifiers,
  holdingsIdentifiers,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditLogs from '../../../support/fragments/bulk-edit/bulk-edit-logs';

let firstUser;
let secondUser;

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditUpdateRecords.gui,
      ]).then((userProperties) => {
        firstUser = userProperties;
        cy.login(firstUser.username, firstUser.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });

      cy.createTempUser([
        permissions.bulkEditLogsView.gui,
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditView.gui,
        permissions.uiInventoryViewInstances.gui,
        permissions.uiInventoryViewCreateEditHoldings.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
        permissions.uiUserCanAssignUnassignPermissions.gui,
        permissions.uiUsersPermissionsView.gui,
        permissions.uiUsersView.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        secondUser = userProperties;
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(firstUser.userId);
      Users.deleteViaApi(secondUser.userId);
    });

    it(
      'C404389 Verify Bulk edit app without permissions for view Users and Inventory records (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C404389'] },
      () => {
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.verifyLogsPane();
        BulkEditLogs.checkHoldingsCheckbox();
        BulkEditLogs.checkUsersCheckbox();
        BulkEditLogs.checkItemsCheckbox();
        BulkEditLogs.logActionsIsAbsent();

        cy.login(secondUser.username, secondUser.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query');

        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.verifySetCriteriaPaneItems(false);
        BulkEditSearchPane.verifyRecordTypesAccordion();
        BulkEditSearchPane.verifyRecordTypeIdentifiers('Users');
        userIdentifiers.forEach((identifier) => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', identifier);
        });

        BulkEditSearchPane.verifyRecordTypeIdentifiers('Items');
        BulkEditSearchPane.clickRecordTypesAccordion();
        BulkEditSearchPane.verifyRecordTypesAccordionCollapsed();
        BulkEditSearchPane.clickRecordTypesAccordion();
        itemIdentifiers.forEach((identifier) => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', identifier);
        });

        BulkEditSearchPane.verifyRecordTypeIdentifiers('Holdings');
        holdingsIdentifiers.forEach((identifier) => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', identifier);
        });

        BulkEditSearchPane.openLogsSearch();
        BulkEditLogs.verifyLogsPane();
      },
    );
  });
});
