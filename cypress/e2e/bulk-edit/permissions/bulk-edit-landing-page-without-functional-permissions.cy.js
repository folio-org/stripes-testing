import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
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
    'C409430 Verify Bulk Edit app landing page without functional permissions (Firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs');
      BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query');
      BulkEditSearchPane.verifyPanesBeforeImport();
      BulkEditSearchPane.verifyBulkEditPaneItems();
      BulkEditSearchPane.verifySetCriteriaPaneItems();
      BulkEditSearchPane.verifyRecordTypesEmpty();
      BulkEditSearchPane.verifyRecordIdentifierDisabled();
      BulkEditSearchPane.verifyDragNDropUpdateUsersArea();
      BulkEditSearchPane.isDragAndDropAreaDisabled(true);
      BulkEditSearchPane.verifyRecordTypesEmpty();
      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
    },
  );
});
