import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Lists', () => {
  describe('Permissions', () => {
    let userData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.listsEnable.gui, Permissions.inventoryAll.gui]).then(
        (userProperties) => {
          userData = userProperties;
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C540397 Verify that displays proper validation message when the user does not have permission to do the action (corsair)',
      { tags: ['extendedPath', 'corsair', 'C540397'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        cy.get('body').type('{alt}N');
        Lists.verifyCalloutMessage('User does not have permission to take this action');
      },
    );
  });
});
