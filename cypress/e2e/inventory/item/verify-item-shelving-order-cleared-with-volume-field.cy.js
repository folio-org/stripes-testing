// No constants needed for this test
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C423489_FolioInstance_${randomPostfix}`;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix,
        itemsCount: 1,
      }),
      callNumberData: {
        callNumber: `CN C423489 ${getRandomLetters(7).toUpperCase()}`,
      },
      volumeData: {
        volume: 'v.1',
      },
    };

    let user;
    let location;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C423489_FolioInstance');

      cy.getLocations({
        limit: 1,
        query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
      }).then((res) => {
        location = res;

        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: testData.folioInstances,
          location,
        });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          user = userProperties;

          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventorySearchAndFilter.waitLoading,
            });
            cy.reload();
            InventorySearchAndFilter.waitLoading();
          }, 20_000);
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
        testData.folioInstances[0].instanceId,
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C423489 Verify that Item\'s "Shelving order" will be cleared if "Call number" fields are cleared in "Holdings" and "Item" has filled "Volume" field (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423489'] },
      () => {
        const itemBarcode = testData.folioInstances[0].items[0].barcode;
        // Navigate to the instance and open item
        InventorySearchAndFilter.searchInstanceByTitle(instanceTitlePrefix);
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(itemBarcode);

        // Step 1: Check "Shelving order" field under "Item data" accordion
        ItemRecordView.verifyShelvingOrder('No value set-');

        // Step 2: Close the detail view of the "Item" record
        ItemRecordView.closeDetailView();
        InventoryInstance.waitLoading();

        // Step 3: Click on "View holdings" >> "Actions" >> "Edit"
        InventoryInstance.openHoldingView();
        HoldingsRecordView.edit();

        // Step 4: Fill in "Holdings call number" field under "Location" accordion
        HoldingsRecordEdit.fillCallNumberValues({
          callNumber: testData.callNumberData.callNumber,
        });

        // Step 5: Click on "Save & close" button
        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordView.waitLoading();

        // Step 6: Close the detail view of the "Holdings" record
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();

        // Step 7: Click on "Holdings" accordion >> Click on the "Item" barcode value
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(itemBarcode);

        // Verify "Shelving order" field is filled with value inherited from "Holdings" record
        ItemRecordView.verifyShelvingOrder(testData.callNumberData.callNumber);

        // Step 8: Click on "Action" button >> Select "Edit" option
        ItemRecordView.openItemEditForm(instanceTitlePrefix);

        // Step 9: Fill in "Volume" field under "Enumeration data" accordion
        ItemRecordNew.fillCallNumberValues({
          volume: testData.volumeData.volume,
        });

        // Step 10: Click on "Save & close" button
        ItemRecordEdit.saveAndClose();
        ItemRecordView.waitLoading();

        // Step 11: Close the detail view of the "Item" record
        ItemRecordView.closeDetailView();
        InventoryInstance.waitLoading();

        // Step 12: Click on "View holdings" >> "Actions" >> "Edit"
        InventoryInstance.openHoldingView();
        HoldingsRecordView.edit();

        // Step 13: Clear "Call number" field under "Location" accordion
        HoldingsRecordEdit.fillCallNumberValues({
          callNumber: '',
        });

        // Step 14: Click on "Save & close" button
        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordView.waitLoading();

        // Step 15: Close the detail view of the "Holdings" record
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();

        // Step 16: Click on "Holdings" accordion >> Click on the "Item" barcode value
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(itemBarcode);

        // Verify "Shelving order" field is empty ("-") and "Volume" field is filled
        ItemRecordView.verifyShelvingOrder('No value set-');
        ItemRecordView.verifyVolume(testData.volumeData.volume);

        // Step 17: Close the detail view of the "Item" record
        ItemRecordView.closeDetailView();
        InventoryInstance.waitLoading();

        // Step 18: Click on "Browse" tab >> Select "Call numbers (all)" browse option
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );
        BrowseCallNumber.waitForCallNumberToAppear(testData.callNumberData.callNumber, false);

        // Step 19: Fill in search box with deleted call number value and search
        cy.intercept('/browse/call-numbers/all/instances*').as('browseCallNumbers');
        InventorySearchAndFilter.browseSearch(testData.callNumberData.callNumber);
        cy.wait('@browseCallNumbers').its('response.statusCode').should('eq', 200);
        BrowseCallNumber.checkNonExactSearchResult(testData.callNumberData.callNumber);
      },
    );
  });
});
