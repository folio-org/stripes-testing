import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { Permissions } from '../../support/dictionary';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import InventoryItems from '../../support/fragments/inventory/item/inventoryItems';
import ItemRecordEdit from '../../support/fragments/inventory/item/itemRecordEdit';
import { Locations } from '../../support/fragments/settings/tenant/location-setup';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({ count: 2 }),
      servicePoint: ServicePoints.getDefaultServicePoint(),
    };
    const admNote1 = 'Original, restore this Item 07-15-2022';
    const admNote2 = 'Original, replace this Item 07-16-2022';
    const queryForNote1 = `item.administrativeNotes ==/ string "${admNote1}"`;
    const queryForNote2 = `item.administrativeNotes ==/ string "${admNote2}"`;
    const searchQueries = [
      'item.administrativeNotes = "original Item"',
      'item.administrativeNotes == "original Item"',
      'item.administrativeNotes == "this Item"',
      'item.administrativeNotes ==/ string "this Item"',
      'item.administrativeNotes ==/ string "this Item"',
    ];
    let firstItemData;
    let secondItemData;

    before('Create test data', () => {
      cy.getAdminToken();
      ServicePoints.createViaApi(testData.servicePoint);
      testData.defaultLocation = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      }).location;
      Locations.createViaApi(testData.defaultLocation).then((location) => {
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
        InventorySearchAndFilter.searchByParameter('Barcode', firstItemData.barcodes[0]);
        ItemRecordView.waitLoading();
        ItemRecordView.openItemEditForm(firstItemData.instanceTitle);
        ItemRecordEdit.addAdministrativeNote(admNote1);
        ItemRecordEdit.saveAndClose({ itemSaved: true });
        ItemRecordView.waitLoading();
        ItemRecordView.checkItemAdministrativeNote(admNote1);
        InventoryItems.closeItem();
        InventorySearchAndFilter.searchByParameter('Barcode', secondItemData.barcodes[0]);
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
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      testData.folioInstances.forEach((instance) => InventoryInstances.deleteInstanceViaApi({
        instance,
        servicePoint: testData.servicePoint,
        shouldCheckIn: true,
      }));
      Locations.deleteViaApi(testData.defaultLocation);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C359149 Search "Item" by administrative note using query search (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        searchQueries.forEach((query) => {
          // Fill in the input field at the " Search & filter " pane with the following search query => Click on the "Search" button.
          InventorySearchAndFilter.searchByParameter('Query search', query);
          // Search completed and at the result list are being displayed the "Instance" records with "Holdings" with "Item" records to which you created "Administrative notes" from precondition.
          InventorySearchAndFilter.verifySearchResult(firstItemData.instanceTitle);
          InventorySearchAndFilter.verifySearchResult(secondItemData.instanceTitle);
        });
        // Edit the search query to " item.administrativeNotes ==/ string "Original, restore this Item 07-15-2022" " => Click on the "Search" button.
        InventorySearchAndFilter.searchByParameter('Query search', queryForNote1);
        // Search completed and at the result list is being displayed the "Instance" record with "Holdings" with "Item" record to which you created "Administrative notes" №1 from precondition.
        InventorySearchAndFilter.verifySearchResult(firstItemData.instanceTitle);
        // Edit the search query to " item.administrativeNotes ==/ string "Original, replace this Item 07-16-2022" " => Click on the "Search" button.
        InventorySearchAndFilter.searchByParameter('Query search', queryForNote2);
        // Search completed and at the result list is being displayed the "Instance" record with "Holdings" with "Item" record to which you created "Administrative notes" №2 from precondition.
        InventorySearchAndFilter.verifySearchResult(secondItemData.instanceTitle);
      },
    );
  });
});
