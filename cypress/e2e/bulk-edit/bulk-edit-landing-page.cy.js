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
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
      permissions.bulkEditQueryView.gui,
      permissions.uiInventoryViewCreateEditItems.gui,
      permissions.uiInventoryViewCreateEditHoldings.gui,
      permissions.uiUserEdit.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: TopMenu.bulkEditPath, waiter: BulkEditSearchPane.waitLoading });
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
  });


  it('C350929 Verify Bulk Edit app - landing page (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    // verify panes
    BulkEditSearchPane.verifyPanesBeforeImport();
    BulkEditSearchPane.verifyBulkEditPaneItems();
    BulkEditSearchPane.verifySetCriteriaPaneItems();
    BulkEditSearchPane.verifyRecordsTypeItems();

    // verify identifier items
    BulkEditSearchPane.verifyRecordIdentifierItems();
    BulkEditSearchPane.verifyDragNDropUsersUIIDsArea();
    BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();

    // verify query items
    BulkEditSearchPane.openQuerySearch();
    BulkEditSearchPane.verifyEmptyQueryPane();
    BulkEditSearchPane.fillQuery('test text');
    BulkEditSearchPane.verifyFilledQueryPane();
    BulkEditSearchPane.resetQueryField();

    // verify items radio
    BulkEditSearchPane.checkItemsRadio();
    BulkEditSearchPane.actionsIsAbsent();
  });
});
