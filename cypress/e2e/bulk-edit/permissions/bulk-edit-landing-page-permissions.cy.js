import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import Users from '../../../support/fragments/users/users';

let user;

describe('bulk-edit', () => {
  describe('permissions', () => {
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
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyBulkEditPaneItems();
        BulkEditSearchPane.verifySetCriteriaPaneItems();
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs', 'Query');
        BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
        BulkEditSearchPane.verifyRecordTypesAccordion();

        BulkEditSearchPane.verifyHoldingIdentifiers();
        BulkEditSearchPane.verifyDragNDropHoldingsUUIDsArea();
        BulkEditSearchPane.verifyDragNDropHoldingsHRIDsArea();
        BulkEditSearchPane.verifyDragNDropInstanceHRIDsArea();
        BulkEditSearchPane.verifyDragNDropHoldingsItemBarcodesArea();

        BulkEditSearchPane.verifyInstanceIdentifiers();
        ['Instance UUIDs', 'Instance HRIDs', 'ISBN', 'ISSN'].forEach((identifier) =>
          BulkEditSearchPane.verifyDragNDropInstanceIdentifierArea(identifier),
        );

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
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs', 'Query');
        BulkEditSearchPane.verifySpecificTabHighlighted('Logs');
        BulkEditSearchPane.verifyLogsPane();
        BulkEditSearchPane.verifyLogsStatusesAccordionExistsAndUnchecked();
        BulkEditSearchPane.verifyRecordTypesSortedAlphabetically();
        BulkEditSearchPane.verifyLogsStartedAccordionCollapsed();
        BulkEditSearchPane.verifyLogsEndedAccordionCollapsed();
        BulkEditSearchPane.verifyUserAccordionCollapsed();
      },
    );
  });
});
