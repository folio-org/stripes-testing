import InventoryInstances, {
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
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
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
    });

    it(
      'C813025 Search for Item by UUID field using "Keyword" and "Item UUID" search options (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C813025'] },
      () => {
        // Step 1: Search for an item by UUID using the “Keyword” search option
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        InventoryInstances.searchByTitle(itemUuids[0]);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 2: Close item detail view and click "Reset all" button
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        // Step 3: Search for an item by UUID via the “Keyword” search option with a leading space
        InventoryInstances.searchByTitle(` ${itemUuids[0]}`);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 4: Close item detail view and click "Reset all" button
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        // Step 5: Search for an item by UUID via the “Keyword” search option with a trailing space
        InventoryInstances.searchByTitle(`${itemUuids[0]}  `);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 6. Close item detail view and click "Reset all" button
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        // Step 7:  Search for an item by UUID via the “Keyword” search option with a leading and trailing spaces
        InventoryInstances.searchByTitle(` ${itemUuids[0]} `);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 8: Close item detail view and select "Item UUID" search option
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.selectSearchOption(searchOptions.itemUuid);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.itemUuid);

        // Step 9: Search for item using item UUID via the "Item UUID" search option
        InventoryInstances.searchByTitle(itemUuids[0]);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 10: Close item detail view and click "Reset all" button
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        // Step 11: Search for item using item UUID via the "Item UUID" search option with leading space
        InventorySearchAndFilter.selectSearchOption(searchOptions.itemUuid);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.itemUuid);
        InventoryInstances.searchByTitle(`  ${itemUuids[0]}`);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 12: Close item detail view and click "Reset all" button
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        // Step 13: Search for item using item UUID via the "Item UUID" search option with trailing space
        InventorySearchAndFilter.selectSearchOption(searchOptions.itemUuid);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.itemUuid);
        InventoryInstances.searchByTitle(`${itemUuids[0]} `);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 14: Close item detail view and click "Reset all" button
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        // Step 15: Search for item using item UUID via the "Item UUID" search option with leading and trailing spaces
        InventorySearchAndFilter.selectSearchOption(searchOptions.itemUuid);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.itemUuid);
        InventoryInstances.searchByTitle(` ${itemUuids[0]} `);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 16: Repeat test with additional item UUIDs
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
