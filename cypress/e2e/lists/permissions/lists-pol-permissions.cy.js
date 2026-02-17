import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Permissions', () => {
    const userData = {};
    const listData = {};

    beforeEach('Create test data', () => {
      listData.name = `C477571-${getTestEntityValue('list')}`;
      listData.description = `C477571-${getTestEntityValue('desc')}`;
      listData.recordType = 'Purchase order lines';
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
      'C477571 C477572 Verify that it\'s possible to access the POL entity type using "Orders: Can edit Orders and Order lines" permission when Lists app permissions assigned (corsair)',
      { tags: ['criticalPath', 'corsair', 'C477571', 'C477572'] },
      () => {
        createNewUser([
          Permissions.listsAll.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
          Permissions.inventoryAll.gui,
          Permissions.ordersStorageAcquisitionMethodsCollectionGet.gui,
        ]);
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);

        Lists.verifyRecordTypes(['Organizations', 'Purchase order lines with titles', 'Users']);

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
      "C477577 C477573 Verify that it's not possible to access the entity type when Lists app permissions are assigned, but the user no longer has that permission (corsair)",
      { tags: ['criticalPath', 'corsair', 'C477577', 'C477573'] },
      () => {
        createNewUser([
          Permissions.listsAll.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.uiOrdersEdit.gui,
          Permissions.uiOrdersView.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
          Permissions.inventoryAll.gui,
          Permissions.ordersStorageAcquisitionMethodsCollectionGet.gui,
        ]);
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);

        Lists.verifyRecordTypes(['Organizations', 'Purchase order lines with titles', 'Users']);

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
