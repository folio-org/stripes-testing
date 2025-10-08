import InventoryInstances, {
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';

describe.skip('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C813025_FolioInstance_${randomPostfix}`;
    const folioInstances = InventoryInstances.generateFolioInstances({
      instanceTitlePrefix,
      count: 3,
      itemsCount: 1,
    });
    const searchOptions = {
      keyword: searchItemsOptions[0],
      itemUuid: searchItemsOptions[10],
    };

    let user;
    const itemUuids = [];
    const itemHrids = [];

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getLocations({
        limit: 1,
        query: '(isActive=true and name<>"*autotest*" and name<>"AT_*")',
      }).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances,
          location,
        }).then(() => {
          // Collect item UUIDs for testing
          folioInstances.forEach((instance) => {
            instance.items.forEach((item) => {
              itemUuids.push(item.id);
              itemHrids.push(item.hrid);
            });
          });
        });
      });

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        user = userProperties;
        cy.waitForAuthRefresh(() => {
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventorySearchAndFilter.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
    });

    // Trillium+ only
    it.skip(
      'C813025 Search for Item by UUID field using "Keyword" and "Item UUID" search options (spitfire)',
      { tags: [] },
      () => {
        // Step 1: Search for item using item UUID with "Keyword" search option
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        InventoryInstances.searchByTitle(itemUuids[0]);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 2: Close item detail view and select "Item UUID" search option
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.selectSearchOption(searchOptions.itemUuid);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.itemUuid);

        // Step 3: Search for item using item UUID with "Item UUID" search option
        InventoryInstances.searchByTitle(itemUuids[0]);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 4: Repeat test with additional item UUIDs
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventoryInstances.searchByTitle(itemUuids[1]);
        ItemRecordView.verifyHrid(itemHrids[1]);

        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventoryInstances.searchByTitle(itemUuids[2]);
        ItemRecordView.verifyHrid(itemHrids[2]);
      },
    );
  });
});
