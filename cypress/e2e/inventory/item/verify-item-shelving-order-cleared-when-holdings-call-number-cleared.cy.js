import { CALL_NUMBER_TYPE_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C405511_FolioInstance_${randomPostfix}`;
    const testData = {
      folioInstances: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix,
        itemsCount: 1,
      }),
      callNumberData: {
        copyNumber: 'c.1',
        callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        callNumberPrefix: 'prefix',
        callNumber: `CN C405511 ${getRandomLetters(7).toUpperCase()}`,
        callNumberSuffix: 'suffix',
      },
    };

    let user;
    let location;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C405511_FolioInstance');

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
      'C405511 Verify that Item\'s "Shelving order" will be cleared if "Call number" fields are cleared in "Holdings" with source=FOLIO (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C405511'] },
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

        // Step 4: Fill in "Holdings call number" fields under "Location" accordion
        HoldingsRecordEdit.fillCallNumberValues({
          copyNumber: testData.callNumberData.copyNumber,
          callNumberType: testData.callNumberData.callNumberType,
          callNumberPrefix: testData.callNumberData.callNumberPrefix,
          callNumber: testData.callNumberData.callNumber,
          callNumberSuffix: testData.callNumberData.callNumberSuffix,
        });

        // Step 5: Click on "Save & close" button
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        HoldingsRecordView.waitLoading();

        // Step 6: Close the detail view of the "Holdings" record
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();

        // Step 7: Click on "Holdings" accordion >> Click on the created "Item" barcode value
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(itemBarcode);

        // Verify "Shelving order" field is filled with value from "Holdings" record
        const expectedShelvingOrder = `${testData.callNumberData.callNumber} ${testData.callNumberData.callNumberSuffix}`;
        ItemRecordView.verifyShelvingOrder(expectedShelvingOrder);

        // Step 8: Close the detail view of the "Item" record
        ItemRecordView.closeDetailView();
        InventoryInstance.waitLoading();

        // Step 9: Click on "View holdings" >> "Actions" >> "Edit"
        InventoryInstance.openHoldingView();
        HoldingsRecordView.edit();

        // Step 10: Clear all "Holdings call number" fields under "Location" accordion
        HoldingsRecordEdit.fillCallNumberValues({
          copyNumber: '',
          callNumberType: 'Select type',
          callNumberPrefix: '',
          callNumber: '',
          callNumberSuffix: '',
        });

        // Step 11: Click on "Save & close" button
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        HoldingsRecordView.waitLoading();

        // Step 12: Close the detail view of the "Holdings" record
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();

        // Step 13: Click on "Holdings" accordion >> Click on the created "Item" barcode value
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(itemBarcode);

        // Verify "Shelving order" field is empty ("-")
        ItemRecordView.verifyShelvingOrder('No value set-');

        // Step 14: Close the detail view of the "Item" record
        ItemRecordView.closeDetailView();
        InventoryInstance.waitLoading();

        // Step 15: Click on "Browse" tab >> Select "Call numbers (all)" browse option
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );
        BrowseCallNumber.waitForCallNumberToAppear(testData.callNumberData.callNumber, false);

        // Step 16: Fill in the search box with deleted call number value and search
        cy.intercept('/browse/call-numbers/all/instances*').as('browseCallNumbers');
        InventorySearchAndFilter.browseSearch(testData.callNumberData.callNumber);
        cy.wait('@browseCallNumbers').its('response.statusCode').should('eq', 200);
        BrowseCallNumber.checkNonExactSearchResult(testData.callNumberData.callNumber);
      },
    );
  });
});
