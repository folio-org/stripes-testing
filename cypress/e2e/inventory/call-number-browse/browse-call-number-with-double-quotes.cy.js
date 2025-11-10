import uuid from 'uuid';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {};
    const randomPostfix = getRandomPostfix();
    const randomPrefix = getRandomLetters(7);

    // Call number data with maximum character limits as specified in test case
    const callNumberData = {
      callNumber: `${randomPrefix} test "value"`,
      callNumberWithSpace: `E K245${randomPostfix}`,
      instanceTitle: `C347915_FolioInstance_${randomPostfix}`,
    };
    const escapedCallNumber = callNumberData.callNumber.replace(/"/g, '\\"');
    const querySearchOption = 'Query search';

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          // Clean up any existing test data
          InventoryInstances.deleteFullInstancesByTitleViaApi('C347915');

          // Get system data
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
          }).then((res) => {
            testData.locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            testData.materialTypeId = res.id;
          });
        })
        .then(() => {
          // Create instance with holdings and item
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: callNumberData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationId,
              },
            ],
          }).then((instanceIds) => {
            // Create item with
            ItemRecordNew.createViaApi({
              holdingsId: instanceIds.holdingIds[0].id,
              itemBarcode: uuid(),
              materialTypeId: testData.materialTypeId,
              permanentLoanTypeId: testData.loanTypeId,
              itemLevelCallNumber: callNumberData.callNumber,
            });
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.userId = userProperties.userId;
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi('C347915');
    });

    it(
      'C347915 Browse for call number with double quotes and check input field when deleting characters (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C347915'] },
      () => {
        // Wait for call number to appear in browse
        BrowseCallNumber.waitForCallNumberToAppear(callNumberData.callNumber);

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);

        // Step 1: Run browse with query which contain a space
        InventorySearchAndFilter.fillInBrowseSearch(callNumberData.callNumberWithSpace);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.checkNonExactSearchResult(callNumberData.callNumberWithSpace);

        // Step 2: Delete characters from search box which are placed before space and space itself using "Delete" keyboard button
        InventorySearchAndFilter.deleteQueryUsingButton(2, '{del}');

        // Step 3: Run browse with query which contain a space:
        InventorySearchAndFilter.fillInBrowseSearch(callNumberData.callNumberWithSpace);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.checkNonExactSearchResult(callNumberData.callNumberWithSpace);

        // Step 4: Delete characters from search box which are placed before space and space itself using "Backspace" keyboard button
        InventorySearchAndFilter.deleteQueryUsingButton(2, '{backspace}');

        // Step 5: Browse for created value which has quotes: test "value"
        InventorySearchAndFilter.fillInBrowseSearch(callNumberData.callNumber);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumberData.callNumber);
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumberData.callNumber, 1);

        // Step 6: Click on found value, which has double quotes
        BrowseCallNumber.selectFoundCallNumber(callNumberData.callNumber);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          querySearchOption,
          `itemFullCallNumbers="${escapedCallNumber}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(callNumberData.instanceTitle);
      },
    );
  });
});
