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
    'C409430 Verify Bulk Edit app landing page without functional permissions (Firebird) (TaaS)',
    { tags: [testTypes.extendedPath, devTeams.firebird] },
    () => {
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Logs');
      BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query');
      BulkEditSearchPane.verifyPanesBeforeImport();
      BulkEditSearchPane.verifyBulkEditPaneItems();
      BulkEditSearchPane.verifySetCriteriaPaneItems();
      BulkEditSearchPane.verifyRecordTypesAccordionExtendedEmpty();
      BulkEditSearchPane.verifyRecordIdentifierDisabled();
      BulkEditSearchPane.verifyDragNDropUpdateUsersArea();
      BulkEditSearchPane.isDragAndDropAreaDisabled(true);
      BulkEditSearchPane.clickRecordTypesAccordion();
      BulkEditSearchPane.verifyRecordTypesAccordionCollapsed();
      BulkEditSearchPane.clickRecordTypesAccordion();
      BulkEditSearchPane.verifyRecordTypesAccordionExtendedEmpty();
      BulkEditSearchPane.openLogsSearch();
      BulkEditSearchPane.verifyLogsPane();
    },
  );
});
