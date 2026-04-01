import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Lists', () => {
  describe('Permissions', () => {
    let userData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.listsAll.gui]).then((userProperties) => {
        userData = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C476850 Verify that it\'s not possible to access the Lists app when there are no entity type permissions assigned (corsair)',
      { tags: ['extendedPath', 'corsair', 'C476850'] },
      () => {
        // #1 Login to FOLIO
        // #2 Click on the "Apps" dropdown, click on "Lists" app
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.verifyNoEntityTypePermissionsWarning();
      },
    );
  });
});
