import TopMenu from '../../../support/fragments/topMenu';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersCard from '../../../support/fragments/users/usersCard';
import QueryModal from '../../../support/fragments/bulk-edit/query-modal';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

let firstUser;
let secondUser;

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewInstances.gui,
        permissions.uiUsersView.gui,
        permissions.uiUserCanAssignUnassignPermissions.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        firstUser = userProperties;
      });

      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
        permissions.uiUsersView.gui,
        permissions.uiUserCanAssignUnassignPermissions.gui,
        permissions.uiUserEdit.gui,
      ]).then((userProperties) => {
        secondUser = userProperties;
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(firstUser.userId);
      Users.deleteViaApi(secondUser.userId);
    });

    it(
      'C692238 Verify Query tab permissions (In app Instances, Holdings, Items) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C692238'] },
      () => {
        cy.login(firstUser.username, firstUser.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query', 'Logs');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByUsername(firstUser.username);
        UsersSearchPane.openUser(firstUser.username);
        // Add bulkEditQueryView permission and remove next three
        UserEdit.addPermissions([
          permissions.bulkEditQueryView.gui,
          permissions.uiUsersView.gui,
          permissions.uiUserCanAssignUnassignPermissions.gui,
          permissions.uiUserEdit.gui,
        ]);
        UserEdit.saveAndClose();
        UsersCard.verifyPermissions([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]);

        cy.login(firstUser.username, firstUser.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Query');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Logs');
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.isHoldingsRadioChecked(false);
        BulkEditSearchPane.isInstancesRadioChecked(false);
        BulkEditSearchPane.isItemsRadioChecked(false);
        BulkEditSearchPane.verifyUsersRadioAbsent();
        BulkEditSearchPane.verifyInputLabel(
          'Select a record type and then click the Build query button.',
        );
        QueryModal.buildQueryButtonDisabled();
      },
    );

    it(
      'C692236 Verify Query tab permissions (In app Instances) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C692236'] },
      () => {
        cy.login(secondUser.username, secondUser.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query', 'Logs');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        UsersSearchPane.searchByUsername(secondUser.username);
        UsersSearchPane.openUser(secondUser.username);
        // Add bulkEditQueryView permission and remove next three
        UserEdit.addPermissions([
          permissions.bulkEditQueryView.gui,
          permissions.uiUsersView.gui,
          permissions.uiUserCanAssignUnassignPermissions.gui,
          permissions.uiUserEdit.gui,
        ]);
        UserEdit.saveAndClose();
        UsersCard.verifyPermissions([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]);

        cy.login(secondUser.username, secondUser.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Query');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Logs');
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.isHoldingsRadioChecked(false);
        BulkEditSearchPane.isInstancesRadioChecked(false);
        BulkEditSearchPane.isItemsRadioChecked(false);
        BulkEditSearchPane.verifyUsersRadioAbsent();
        BulkEditSearchPane.verifyInputLabel(
          'Select a record type and then click the Build query button.',
        );
        QueryModal.buildQueryButtonDisabled();
      },
    );
  });
});
