import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';

let user;
let userCircAndLogsPermissions;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test users', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiUsersView.gui,
        permissions.uiInventoryViewInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });

      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.circulationLogAll.gui,
        permissions.inventoryAll.gui,
        permissions.uiUserEdit.gui,
        permissions.uiUsersView.gui,
      ]).then((userProperties) => {
        userCircAndLogsPermissions = userProperties;
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      Users.deleteViaApi(userCircAndLogsPermissions.userId);
    });

    it(
      'C360090 Verify switching between Inventory record types radio buttons (firebird)',
      { tags: [testTypes.smoke, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.verifyInputLabel('Drag and drop or choose file with holdings UUIDs');
        BulkEditSearchPane.verifyInputLabel('Select a file with holdings UUIDs');

        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Item UUIDs');
        BulkEditSearchPane.verifyInputLabel('Drag and drop or choose file with item UUIDs');
        BulkEditSearchPane.verifyInputLabel('Select a file with item UUIDs');

        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings HRIDs');
        BulkEditSearchPane.verifyInputLabel('Drag and drop or choose file with holdings HRIDs');
        BulkEditSearchPane.verifyInputLabel('Select a file with holdings HRIDs');

        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('Usernames');
        BulkEditSearchPane.verifyInputLabel('Drag and drop or choose file with Usernames');
        BulkEditSearchPane.verifyInputLabel('Select a file with Usernames');
      },
    );

    it(
      'C347870 Verify that user with Bulk Edit: View and Edit permission can start bulk editing (firebird)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        cy.login(userCircAndLogsPermissions.username, userCircAndLogsPermissions.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.actionsIsAbsent();
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
      },
    );
  });
});
