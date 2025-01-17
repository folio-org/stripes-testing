import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('lists', () => {
  describe('permissions', () => {
    const userData = {};
    const listData = {};

    beforeEach('Create test data', () => {
      listData.name = `C476845-${getTestEntityValue('list')}`;
      listData.description = `C476845-${getTestEntityValue('desc')}`;
      listData.recordType = 'Users';
      listData.status = 'Active';
      listData.visibility = 'Shared';
    });

    afterEach('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(listData.name);
      Users.deleteViaApi(userData.userId);
    });

    const createNewUser = (permissions) => {
      cy.createTempUser(permissions)
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        });
    };

    it(
      'C476845 C477582 Verify that it\'s possible to access the entity type using "Users: Can view user profile" permission when Lists app permissions assigned (corsair)',
      { tags: ['criticalPath', 'corsair', 'C476845', 'C477582'] },
      () => {
        createNewUser([Permissions.listsAll.gui, Permissions.uiUsersView.gui]);
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);

        Lists.verifyRecordTypes(['Users']);

        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData, rowIndex);
        });
      },
    );

    it(
      'C476846 Verify that it\'s possible to access the entity type using "Users: View requests" permission when Lists app permissions assigned (corsair)',
      { tags: ['extendedPath', 'corsair', 'C476846'] },
      () => {
        createNewUser([Permissions.listsAll.gui, Permissions.usersViewRequests.gui]);
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);

        Lists.verifyRecordTypes(['Users']);

        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData, rowIndex);
        });
      },
    );

    it(
      "C476851 C476847 Verify that it's not possible to access the entity type when Lists app permissions are assigned, but the user no longer has that permission (corsair)",
      { tags: ['criticalPath', 'corsair', 'C476851', 'C476847'] },
      () => {
        createNewUser([
          Permissions.listsAll.gui,
          Permissions.uiUsersView.gui,
          Permissions.usersViewRequests.gui,
        ]);
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);

        Lists.verifyRecordTypes(['Users']);

        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();
        Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
          Lists.checkResultSearch(listData, rowIndex);
        });

        Lists.getListIdByNameViaApi(listData.name).then((listId) => {
          createNewUser([Permissions.listsAll.gui, Permissions.inventoryAll.gui]);

          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.name);
          Lists.verifyRecordTypes(['Holdings', 'Instances', 'Items']);

          cy.visit(`lists/list/${listId}`);
          Lists.verifyYouDoNotHavePermissionsToViewThisListIsShown();
        });
      },
    );
  });
});
