import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';

let user;
let userWithInventoryView;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test users', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditQueryView.gui,
        permissions.uiInventoryViewInstances.gui,
      ])
        .then(userProperties => {
          userWithInventoryView = userProperties;
        });
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditQueryView.gui,
      ])
        .then(userProperties => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading
          });
        });
    });

    after('delete test data', () => {
      users.deleteViaApi(user.userId);
    });

    it('C366073 Verify Bulk edit elements in the left pane --In app (firebird)', { tags: [testTypes.criticalPath, devTeams.firebird] }, () => {
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Query');
      BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
      BulkEditSearchPane.verifyRecordTypesEmpty();
      BulkEditSearchPane.verifyRecordIdentifierEmpty();
      BulkEditSearchPane.isDragAndDropAreaDisabled(true);

      BulkEditSearchPane.openQuerySearch();
      BulkEditSearchPane.verifySpecificTabHighlighted('Query');
      BulkEditSearchPane.verifyRecordTypesEmpty();
      BulkEditSearchPane.isBuildQueryButtonDisabled(true);

      // Need to wait for verification to complete
      cy.wait(2000);
      cy.login(userWithInventoryView.username, userWithInventoryView.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading
      });
      BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Query');
      BulkEditSearchPane.verifySpecificTabHighlighted('Identifier');
      BulkEditSearchPane.itemsRadioIsDisabled(false);
      BulkEditSearchPane.isItemsRadioChecked();
      BulkEditSearchPane.holdingsRadioIsDisabled(false);
      BulkEditSearchPane.isDragAndDropAreaDisabled(true);

      BulkEditSearchPane.openQuerySearch();
      BulkEditSearchPane.verifySpecificTabHighlighted('Query');
      BulkEditSearchPane.itemsRadioIsDisabled(false);
      BulkEditSearchPane.isItemsRadioChecked();
      BulkEditSearchPane.holdingsRadioIsDisabled(false);
      BulkEditSearchPane.isBuildQueryButtonDisabled(false);

      BulkEditSearchPane.clickBuildQueryButton();
      BulkEditSearchPane.verifyBuildQueryModal();
    });
  });
});
