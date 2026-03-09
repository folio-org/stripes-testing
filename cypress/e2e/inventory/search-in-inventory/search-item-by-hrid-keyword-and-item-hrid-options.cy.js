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
    const instanceTitlePrefix = `AT_C9208_FolioInstance_${randomPostfix}`;
    const folioInstances = InventoryInstances.generateFolioInstances({
      instanceTitlePrefix,
      count: 3,
      itemsCount: 1,
    });
    const searchOptions = {
      keyword: searchItemsOptions[0],
      itemHrid: searchItemsOptions[9],
    };

    let user;
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
          // Collect item HRIDs for testing
          folioInstances.forEach((instance) => {
            instance.items.forEach((item) => {
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
      'C9208 Search for Item by HRID field using "Keyword" and "Item HRID" search options (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C9208'] },
      () => {
        // Step 1: Open Inventory app and select item segment
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        // Step 2: Search for item using item HRID via "Keyword" search option
        InventoryInstances.searchByTitle(itemHrids[0]);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 3: Close item detail view and click "Reset all" button
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        // Step 4: Search for item using item HRID via "Keyword" search option with leading space
        InventoryInstances.searchByTitle(` ${itemHrids[0]}`);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 5: Close item detail view and click "Reset all" button
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        // Step 6: Search for item using item HRID via "Keyword" search option with trailing space
        InventoryInstances.searchByTitle(`${itemHrids[0]}  `);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 7: Close item detail view and click "Reset all" button
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        // Step 8: Search for item using item HRID via "Keyword" search option with leading and trailing spaces
        InventoryInstances.searchByTitle(` ${itemHrids[0]} `);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 9: Close item detail view and select "Item HRID" search option
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.selectSearchOption(searchOptions.itemHrid);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.itemHrid);

        // Step 10: Search for item using item HRID via "Item HRID" search option
        InventoryInstances.searchByTitle(itemHrids[0]);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 11: Close item detail view and click "Reset all" button
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        // Step 12: Search for item using item HRID via "Item HRID" search option with leading space
        InventorySearchAndFilter.selectSearchOption(searchOptions.itemHrid);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.itemHrid);
        InventoryInstances.searchByTitle(`  ${itemHrids[0]}`);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 13: Close item detail view and click "Reset all" button
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        // Step 14: Search for item using item HRID via "Item HRID" search option with trailing space
        InventorySearchAndFilter.selectSearchOption(searchOptions.itemHrid);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.itemHrid);
        InventoryInstances.searchByTitle(`${itemHrids[0]} `);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 15: Close item detail view and click "Reset all" button
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        // Step 16: Search for item using item HRID via "Item HRID" search option with leading and trailing spaces
        InventorySearchAndFilter.selectSearchOption(searchOptions.itemHrid);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.itemHrid);
        InventoryInstances.searchByTitle(` ${itemHrids[0]} `);
        ItemRecordView.verifyHrid(itemHrids[0]);

        // Step 17: Repeat test with additional item HRIDs
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventoryInstances.searchByTitle(itemHrids[1]);
        ItemRecordView.verifyHrid(itemHrids[1]);

        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventoryInstances.searchByTitle(itemHrids[2]);
        ItemRecordView.verifyHrid(itemHrids[2]);
      },
    );
  });
});
