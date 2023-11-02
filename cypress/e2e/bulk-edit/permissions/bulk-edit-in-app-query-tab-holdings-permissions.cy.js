import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import devTeams from '../../../support/dictionary/devTeams';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersCard from '../../../support/fragments/users/usersCard';

let user;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.inventoryCRUDHoldings.gui,
        permissions.uiUsersView.gui,
        permissions.uiUsersPermissions.gui,
        permissions.uiUserEdit.gui,
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
      'C413373 Verify Query tab permissions (In app holdings) (firebird)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query', 'Logs');

        cy.visit(TopMenu.usersPath);
        UsersSearchPane.searchByUsername(user.username);
        UsersSearchPane.openUser(user.username);
        // Add bulkEditQueryView permission and remove next three
        UserEdit.addPermissions([
          permissions.bulkEditQueryView.gui,
          permissions.uiUsersView.gui,
          permissions.uiUsersPermissions.gui,
          permissions.uiUserEdit.gui,
        ]);
        UserEdit.saveAndClose();
        UsersCard.verifyPermissions([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.inventoryCRUDHoldings.gui,
          permissions.bulkEditQueryView.gui,
        ]);

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query', 'Logs');
      },
    );
  });
});
