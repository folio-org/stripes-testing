import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';

let firstUser;
let secondUser;

describe('bulk-edit', () => {
  describe('permissions', () => {
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
        permissions.uiUsersPermissions.gui,
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
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.verifyLogsPane();
        BulkEditSearchPane.checkHoldingsCheckbox();
        BulkEditSearchPane.checkUsersCheckbox();
        BulkEditSearchPane.checkItemsCheckbox();
        BulkEditSearchPane.logActionsIsAbsent();

        cy.login(secondUser.username, secondUser.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query');

        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.verifySetCriteriaPaneItems();
        BulkEditSearchPane.verifyRecordTypesAccordion();
        BulkEditSearchPane.verifyRecordIdentifierItems();
        BulkEditSearchPane.verifyDragNDropUsersUUIDsArea();
        BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();
        BulkEditSearchPane.verifyDragNDropExternalIDsArea();
        BulkEditSearchPane.verifyDragNDropUsernamesArea();

        BulkEditSearchPane.verifyItemIdentifiersDefaultState();
        BulkEditSearchPane.clickRecordTypesAccordion();
        BulkEditSearchPane.verifyRecordTypesAccordionCollapsed();
        BulkEditSearchPane.clickRecordTypesAccordion();
        BulkEditSearchPane.verifyDragNDropItemBarcodeArea();
        BulkEditSearchPane.verifyDragNDropItemUUIDsArea();
        BulkEditSearchPane.verifyDragNDropItemHRIDsArea();
        BulkEditSearchPane.verifyDragNDropItemFormerIdentifierArea();
        BulkEditSearchPane.verifyDragNDropItemAccessionNumberArea();
        BulkEditSearchPane.verifyDragNDropItemHoldingsUUIDsArea();

        BulkEditSearchPane.verifyHoldingIdentifiers();
        BulkEditSearchPane.verifyDragNDropHoldingsUUIDsArea();
        BulkEditSearchPane.verifyDragNDropHoldingsHRIDsArea();
        BulkEditSearchPane.verifyDragNDropInstanceHRIDsArea();
        BulkEditSearchPane.verifyDragNDropHoldingsItemBarcodesArea();

        BulkEditSearchPane.openLogsSearch();
        BulkEditSearchPane.verifyLogsPane();
      },
    );
  });
});
