import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import CustomFields from '../../../support/fragments/settings/users/customFields';

describe('Lists', () => {
  describe('Add new list', () => {
    let userData = {};
    const listData = {
      name: getTestEntityValue('list'),
    };

    before('Create test data', () => {
      cy.getAdminToken();
      // cy.createTempUser([
      //   Permissions.listsEdit.gui,
      //   Permissions.usersViewRequests.gui,
      //   Permissions.uiOrdersCreate.gui,
      //   Permissions.inventoryAll.gui,
      //   Permissions.loansAll.gui,
      //   Permissions.uiOrganizationsViewEditCreate.gui,
      // ]).then((userProperties) => {
      //   userData = userProperties;
      // });
    });

    after('Delete test data', () => {
      // cy.getAdminToken();
      // Lists.deleteListByNameViaApi(listData.name);
      // Users.deleteViaApi(userData.userId);
    });

    it(
      'C411705 Verify that created new list is visible on the "Lists" landing page (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C411705'] },
      () => {
        // CustomFields.getCustomFieldsConfigViaApi().then((customFields) => {
        //   cy.log(JSON.stringify(customFields));
        // });
        CustomFields.getCustomFieldsViaApi().then((customFields) => {
          cy.log(JSON.stringify(customFields));
        });


        // cy.login(userData.username, userData.password, {
        //   path: TopMenu.listsPath,
        //   waiter: Lists.waitLoading,
        // });
      },
    );
  });
});
