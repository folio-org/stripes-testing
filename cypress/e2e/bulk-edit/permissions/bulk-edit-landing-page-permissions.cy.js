import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';

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
      permissions.uiUserEdit.gui,
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
    'C409436 Verify Bulk Edit app landing page with functional permissions (firebird) (TaaS)',
    { tags: [testTypes.criticalPath, devTeams.firebird] },
    () => {
      BulkEditSearchPane.verifyPanesBeforeImport();
      BulkEditSearchPane.verifyBulkEditPaneItems();
      BulkEditSearchPane.verifySetCriteriaPaneItems();
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs');
      BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query');
      BulkEditSearchPane.verifyRecordTypesAccordion();

      BulkEditSearchPane.verifyHoldingIdentifiers();
      BulkEditSearchPane.verifyDragNDropHoldingsUUIDsArea();
      BulkEditSearchPane.verifyDragNDropHoldingsHRIDsArea();
      BulkEditSearchPane.verifyDragNDropInstanceHRIDsArea();
      BulkEditSearchPane.verifyDragNDropHoldingsItemBarcodesArea();

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

      BulkEditSearchPane.verifyRecordIdentifierItems();
      BulkEditSearchPane.verifyDragNDropUsersUUIDsArea();
      BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();
      BulkEditSearchPane.verifyDragNDropExternalIDsArea();
      BulkEditSearchPane.verifyDragNDropUsernamesArea();

      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
    },
  );
});
