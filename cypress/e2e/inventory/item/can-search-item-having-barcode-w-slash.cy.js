import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  InventoryInstances,
  InventorySearchAndFilter,
  ItemRecordView,
} from '../../../support/fragments/inventory';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const barcode = `${randomFourDigitNumber()}/${randomFourDigitNumber()}`;
    const testData = {
      barcodes: [barcode, barcode.replace('/', '')],
      folioInstances: InventoryInstances.generateFolioInstances({ itemsCount: 0 }),
      servicePoint: ServicePoints.getDefaultServicePoint(),
      user: {},
    };

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
        testData.location = Locations.getDefaultLocation({
          servicePointId: testData.servicePoint.id,
        }).location;

        Locations.createViaApi(testData.location).then((location) => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.inventoryAll.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
          testData.folioInstances[0].instanceId,
        );
        Locations.deleteViaApi(testData.location);
        ServicePoints.deleteViaApi(testData.servicePoint.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C423380 Check that item barcodes with slashes can be searched (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C423380'] },
      () => {
        // Click on instance from preconditions
        InventoryInstances.searchByTitle(testData.folioInstances[0].instanceTitle);
        InventoryInstances.selectInstance();

        // Click "Add item" button on "Holdings" accordion
        InventoryInstance.clickAddItemByHoldingName({
          holdingName: testData.location.name,
          instanceTitle: testData.folioInstances[0].instanceTitle,
        });

        // Populate the following fields: "Material type", "Permanent loan type"
        ItemRecordNew.fillItemRecordFields({
          barcode: testData.barcodes[0],
          materialType: 'book',
          loanType: 'Can circulate',
        });

        // Click on "Save & Close" button
        ItemRecordNew.saveAndClose({ itemSaved: true });
        InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location.name, 1);

        // Expand the holdings accordion
        InventoryInstance.checkHoldingsTableContent({
          name: testData.location.name,
          records: [{ barcode: testData.barcodes[0], status: ITEM_STATUS_NAMES.AVAILABLE }],
        });

        // "Search & filter" section select "Item" tab
        InventorySearchAndFilter.switchToItem();

        // Select "Barcode" in "Keyword" dropdown ->  Enter populated barcode
        InventorySearchAndFilter.searchByParameter('Barcode', testData.barcodes[0]);
        ItemRecordView.checkBarcode(testData.barcodes[0]);

        // Click "Actions" button< Select "Edit" option
        ItemRecordView.openItemEditForm(testData.folioInstances[0].instanceTitle);

        // Change the barcode by deleting the slash symbol from it
        ItemRecordEdit.fillItemRecordFields({
          barcode: testData.barcodes[1],
        });

        // Click "Save and close" button
        ItemRecordEdit.saveAndClose();
        ItemRecordView.checkItemRecordDetails({
          administrativeData: [
            { label: 'Item barcode', conditions: { value: testData.barcodes[1] } },
          ],
        });

        // Click "X" button in upper right corner
        ItemRecordView.closeDetailView();

        // "Search & filter" section select "Item" tab
        InventorySearchAndFilter.switchToItem();

        // Select "Barcode" in "Keyword" dropdown ->  Enter populated barcode
        InventorySearchAndFilter.resetAll();
        InventorySearchAndFilter.searchByParameter('Barcode', testData.barcodes[0]);
        InventorySearchAndFilter.verifyResultPaneEmpty({
          noResultsFound: true,
          searchQuery: testData.barcodes[0],
        });
      },
    );
  });
});
