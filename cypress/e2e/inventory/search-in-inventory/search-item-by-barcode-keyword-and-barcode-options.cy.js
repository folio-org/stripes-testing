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
    const simpleBarcode = `5412658${randomPostfix}`;
    const barcodeWithParentheses = `132654(987)${randomPostfix}`;
    const instanceTitlePrefix = `AT_C2317_FolioInstance_${randomPostfix}`;
    const folioInstances = InventoryInstances.generateFolioInstances({
      instanceTitlePrefix,
      count: 2,
      itemsProperties: [{ barcode: simpleBarcode }, { barcode: barcodeWithParentheses }],
    });
    const searchOptions = {
      keyword: searchItemsOptions[0],
      barcode: searchItemsOptions[1],
    };

    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getLocations({
        limit: 1,
        query: '(isActive=true and name<>"*autotest*" and name<>"AT_*")',
      }).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances,
          location,
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
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
      'C2317 Search for Item by barcode field using "Keyword" and "Barcode" search options (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C2317'] },
      () => {
        // Step 1: Search for item with simple barcode using "Keyword" search option
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.keyword);

        InventoryInstances.searchByTitle(simpleBarcode);
        ItemRecordView.verifyItemBarcode(simpleBarcode);
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();

        // Step 2: Search for item with parentheses in barcode using "Keyword" search option
        InventoryInstances.searchByTitle(barcodeWithParentheses);
        ItemRecordView.verifyItemBarcode(barcodeWithParentheses);
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();

        // Step 3: Select "Barcode" search option
        InventorySearchAndFilter.selectSearchOption(searchOptions.barcode);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.barcode);

        // Step 4: Search for item with simple barcode using "Barcode" search option
        InventoryInstances.searchByTitle(simpleBarcode);
        ItemRecordView.verifyItemBarcode(simpleBarcode);

        // Step 5: Close item detail view and search for item with parentheses using "Barcode" search option
        ItemRecordView.closeDetailView();
        InventorySearchAndFilter.waitLoading();
        InventoryInstances.searchByTitle(barcodeWithParentheses);
        ItemRecordView.verifyItemBarcode(barcodeWithParentheses);
      },
    );
  });
});
