import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../support/dictionary/devTeams';
import Users from '../../support/fragments/users/users';

let user;

describe('bulk-edit', () => {
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
      permissions.uiUsersPermissions.gui,
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
    Users.deleteViaApi(user.userId);
  });

  it(
    'C350929 Verify Bulk Edit app - landing page (firebird)',
    { tags: [testTypes.smoke, devTeams.firebird] },
    () => {
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs');
      BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query');

      // verify panes
      BulkEditSearchPane.verifyPanesBeforeImport();
      BulkEditSearchPane.verifyBulkEditPaneItems();
      BulkEditSearchPane.verifySetCriteriaPaneItems();
      BulkEditSearchPane.verifyRecordTypesAccordion();

      // verify identifier items
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

      // verify logs items
      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
    },
  );
});
