import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C422097_FolioInstance_${randomPostfix}`;
    const searchQuery = '*';

    let createdInstanceId;
    let user;

    function searchResetAndCheckFocus() {
      InventoryInstances.searchByTitle(searchQuery);
      InventorySearchAndFilter.verifyResultListExists();
      InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
      InventorySearchAndFilter.checkSearchQueryText('');
      InventorySearchAndFilter.checkSearchInputFieldInFocus(true);
    }

    before(() => {
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        InventoryInstance.createInstanceViaApi({ instanceTitle }).then(({ instanceData }) => {
          createdInstanceId = instanceData.instanceId;
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(createdInstanceId);
    });

    it(
      'C422097 Inventory search: verify that clicking on "Reset all" button will return focus and cursor to the Search box (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422097'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });

        searchResetAndCheckFocus();

        InventorySearchAndFilter.switchToHoldings();
        searchResetAndCheckFocus();

        InventorySearchAndFilter.switchToItem();
        searchResetAndCheckFocus();
      },
    );
  });
});
