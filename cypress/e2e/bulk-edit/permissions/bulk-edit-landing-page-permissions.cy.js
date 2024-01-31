import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane, {
  userIdentifiers,
  itemIdentifiers,
  instanceIdentifiers,
  holdingsIdentifiers,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
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

        BulkEditSearchPane.verifyRecordTypeIdentifiers('Holdings');
        holdingsIdentifiers.forEach((identifier) => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', identifier);
        });

        BulkEditSearchPane.verifyRecordTypeIdentifiers('Instances');
        instanceIdentifiers.forEach((identifier) => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instances', identifier);
        });

        BulkEditSearchPane.verifyRecordTypeIdentifiers('Items');
        BulkEditSearchPane.clickRecordTypesAccordion();
        BulkEditSearchPane.verifyRecordTypesAccordionCollapsed();
        BulkEditSearchPane.clickRecordTypesAccordion();
        itemIdentifiers.forEach((identifier) => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', identifier);
        });

        BulkEditSearchPane.verifyRecordTypeIdentifiers('Users');
        userIdentifiers.forEach((identifier) => {
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', identifier);
        });

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
