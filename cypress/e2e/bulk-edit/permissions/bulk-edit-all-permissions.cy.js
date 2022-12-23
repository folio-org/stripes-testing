import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../../support/dictionary/devTeams';
import users from '../../../support/fragments/users/users';

let user;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test users', () => {
      cy.createTempUser([
        permissions.bulkEditCsvView.gui,
        permissions.bulkEditCsvEdit.gui,
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
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

    it('C360090 Verify switching between Inventory record types radio buttons (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
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
    });
  });
});
