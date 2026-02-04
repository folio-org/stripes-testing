import TopMenu from '../../../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import { parseSanityParameters } from '../../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('setup', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password);

      cy.wait(5000);
      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.bulkEditPath,
        waiter: BulkEditSearchPane.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    it(
      'C360090 Verify switching between Inventory record types radio buttons (firebird)',
      { tags: ['dryRun', 'firebird', 'C360090'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings HRIDs');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'Usernames');
      },
    );
  });
});
