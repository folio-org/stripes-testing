import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../../support/dictionary';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
    };
    const admNote1 = 'Original, restore this Item 07-15-2022';
    const admNote2 = 'Original, replace this Item 07-16-2022';
    const queryForNote1 = `item.administrativeNotes ==/ string "${admNote1}"`;
    const queryForNote2 = `item.administrativeNotes ==/ string "${admNote2}"`;
    const searchQueries = [
      'item.administrativeNotes = "original Item"',
      'item.administrativeNotes == "original Item"',
      'item.administrativeNotes == "this Item"',
    ];
    const noResultsQueries = [
      'item.administrativeNotes ==/ string "this Item"',
      'item.administrativeNotes ==/ string "this item"',
    ];
    let firstItemData;
    let secondItemData;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((location) => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });
      });
      firstItemData = testData.folioInstances[0];
      secondItemData = testData.folioInstances[1];
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.selectSearchOption('Barcode');
        InventorySearchAndFilter.executeSearch(firstItemData.barcodes[0]);
        ItemRecordView.waitLoading();
        ItemRecordView.openItemEditForm(firstItemData.instanceTitle);
        ItemRecordEdit.addAdministrativeNote(admNote1);
        ItemRecordEdit.saveAndClose({ itemSaved: true });
        ItemRecordView.waitLoading();
        ItemRecordView.checkItemAdministrativeNote(admNote1);
        InventoryItems.closeItem();
        InventorySearchAndFilter.selectSearchOption('Barcode');
        InventorySearchAndFilter.executeSearch(secondItemData.barcodes[0]);
        ItemRecordView.waitLoading();
        ItemRecordView.openItemEditForm(secondItemData.instanceTitle);
        ItemRecordEdit.addAdministrativeNote(admNote2);
        ItemRecordEdit.saveAndClose({ itemSaved: true });
        ItemRecordView.waitLoading();
        ItemRecordView.checkItemAdministrativeNote(admNote2);
        InventoryItems.closeItem();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(firstItemData.barcodes[0]);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(
        secondItemData.barcodes[0],
      );
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C359149 Search "Item" by administrative note using query search (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C359149', 'eurekaPhase1'] },
      () => {
        searchQueries.forEach((query) => {
          // Fill in the input field at the " Search & filter " pane with the following search query => Click on the "Search" button.
          InventorySearchAndFilter.selectSearchOption('Query search');
          InventorySearchAndFilter.executeSearch(query);
          // Search completed and at the result list are being displayed the "Instance" records with "Holdings" with "Item" records to which you created "Administrative notes" from precondition.
          InventorySearchAndFilter.verifySearchResult(firstItemData.instanceTitle);
          InventorySearchAndFilter.verifySearchResult(secondItemData.instanceTitle);
        });

        noResultsQueries.forEach((query) => {
          // Fill in the input field at the " Search & filter " pane with the following search query => Click on the "Search" button.
          InventorySearchAndFilter.selectSearchOption('Query search');
          InventorySearchAndFilter.executeSearch(query);
          // Search completed and no results found for excact match query.
          InventorySearchAndFilter.verifyResultPaneEmpty({
            noResultsFound: true,
            searchQuery: query,
          });
        });

        // Edit the search query to " item.administrativeNotes ==/ string "Original, restore this Item 07-15-2022" " => Click on the "Search" button.
        InventorySearchAndFilter.selectSearchOption('Query search');
        InventorySearchAndFilter.executeSearch(queryForNote1);
        // Search completed and at the result list is being displayed the "Instance" record with "Holdings" with "Item" record to which you created "Administrative notes" №1 from precondition.
        InventorySearchAndFilter.verifySearchResult(firstItemData.instanceTitle);
        // Edit the search query to " item.administrativeNotes ==/ string "Original, replace this Item 07-16-2022" " => Click on the "Search" button.
        InventorySearchAndFilter.selectSearchOption('Query search');
        InventorySearchAndFilter.executeSearch(queryForNote2);
        // Search completed and at the result list is being displayed the "Instance" record with "Holdings" with "Item" record to which you created "Administrative notes" №2 from precondition.
        InventorySearchAndFilter.verifySearchResult(secondItemData.instanceTitle);
      },
    );
  });
});
