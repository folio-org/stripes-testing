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
      listData.name = `C477578-${getTestEntityValue('list')}`;
      listData.description = `C477578-${getTestEntityValue('desc')}`;
      listData.recordType = 'Organizations';
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
          listData.test = 'test';
        })
        .then(() => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        });
    };

    it(
      'C477578 Verify that it\'s possible to access the entity type using "Organizations: View" permission when Lists app permissions assigned (corsair)',
      { tags: ['criticalPath', 'corsair', 'C477578'] },
      () => {
        createNewUser([Permissions.listsAll.gui, Permissions.uiOrganizationsView.gui]);
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);

        Lists.verifyRecordTypes(['Organizations']);

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
      'C477579 Verify that it\'s possible to access the entity type using "Organizations: View, edit" permission when Lists app permissions assigned (corsair)',
      { tags: ['extendedPath', 'corsair', 'C477579'] },
      () => {
        createNewUser([Permissions.listsAll.gui, Permissions.uiOrganizationsViewEdit.gui]);
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);

        Lists.verifyRecordTypes(['Organizations']);

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
      'C477580 Verify that it\'s possible to access the entity type using "Organizations: View, edit, create" permission when Lists app permissions assigned (corsair)',
      { tags: ['extendedPath', 'corsair', 'C477580'] },
      () => {
        createNewUser([Permissions.listsAll.gui, Permissions.uiOrganizationsViewEditCreate.gui]);
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);

        Lists.verifyRecordTypes(['Organizations']);

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
      'C477581 Verify that it\'s possible to access the entity type using "Organizations: View, edit, delete" permission when Lists app permissions assigned (corsair)',
      { tags: ['extendedPath', 'corsair', 'C477581'] },
      () => {
        createNewUser([Permissions.listsAll.gui, Permissions.uiOrganizationsViewEditDelete.gui]);
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);

        Lists.verifyRecordTypes(['Organizations']);

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
      "C477587 Verify that it's not possible to access the entity type when Lists app permissions are assigned, but the user no longer has that permission (corsair)",
      { tags: ['extendedPath', 'corsair', 'C477587'] },
      () => {
        createNewUser([
          Permissions.listsAll.gui,
          Permissions.uiOrganizationsView.gui,
          Permissions.uiOrganizationsViewEdit.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
          Permissions.uiOrganizationsViewEditDelete.gui,
        ]);
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);

        Lists.verifyRecordTypes(['Organizations']);

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
          createNewUser([Permissions.listsAll.gui, Permissions.uiUsersView.gui]);

          cy.visit(`lists/list/${listId}`);
          Lists.verifyYouDoNotHavePermissionsToViewThisListIsShown();
        });
      },
    );
  });
});
