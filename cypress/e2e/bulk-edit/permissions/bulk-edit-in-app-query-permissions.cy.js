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
      ]).then((userProperties) => {
        userWithInventoryView = userProperties;
      });
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
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
      users.deleteViaApi(user.userId);
    });

    it(
      'C366073 Verify Bulk edit elements in the left pane --In app (firebird)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query');
        BulkEditSearchPane.verifyRecordTypesEmpty();
        BulkEditSearchPane.verifyRecordIdentifierEmpty();
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);

        // Without waiter, user is not logging in
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(500);
        cy.login(userWithInventoryView.username, userWithInventoryView.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });

        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query');
        BulkEditSearchPane.itemsRadioIsDisabled(false);
        BulkEditSearchPane.isItemsRadioChecked(false);
        BulkEditSearchPane.holdingsRadioIsDisabled(false);
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
      },
    );
  });
});
