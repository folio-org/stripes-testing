import uuid from 'uuid';
import { BROWSE_CALL_NUMBER_OPTIONS, CALL_NUMBER_TYPE_NAMES } from '../../../support/constants';
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
    const randomLetters = getRandomLetters(50);

    // Call number data with maximum character limits as specified in test case
    const callNumberData = {
      prefix: `20C700864${randomLetters.slice(0, 11)}`, // 20 characters
      callNumber: `50C700864${randomLetters.slice(0, 41)}`, // 50 characters
      suffix: `25C700864${randomLetters.slice(0, 16)}`, // 25 characters
      volume: `50C700864${randomLetters.slice(0, 41)}`, // 50 characters
      enumeration: `50C700864${randomLetters.slice(0, 41)}`, // 50 characters
      chronology: `50C700864${randomLetters.slice(0, 41)}`, // 50 characters
      copyNumber: 'C700864copynumber',
      instanceTitle: `AT_C700864_FolioInstance_${randomPostfix}`,
    };

    // Combined call number for browsing (call number + suffix)
    const browseQuery = `${callNumberData.callNumber} ${callNumberData.suffix}`;
    // Combined call number for results (prefix + call number + suffix)
    const expectedResult = `${callNumberData.prefix} ${callNumberData.callNumber} ${callNumberData.suffix}`;

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          // Clean up any existing test data
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C700864');

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

          InventoryInstances.getCallNumberTypes({ limit: 100 }).then((res) => {
            testData.callNumberTypes = res;
            testData.lcCallNumberTypeId = res.find(
              (el) => el.name === CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
            ).id;
          });
        })
        .then(() => {
          // Create instance with holdings and item with maximum character call numbers
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
            // Create item with maximum character limit call number fields
            ItemRecordNew.createViaApi({
              holdingsId: instanceIds.holdingIds[0].id,
              itemBarcode: uuid(),
              materialTypeId: testData.materialTypeId,
              permanentLoanTypeId: testData.loanTypeId,
              itemLevelCallNumberTypeId: testData.lcCallNumberTypeId,
              itemLevelCallNumberPrefix: callNumberData.prefix,
              itemLevelCallNumber: callNumberData.callNumber,
              itemLevelCallNumberSuffix: callNumberData.suffix,
              volume: callNumberData.volume,
              enumeration: callNumberData.enumeration,
              chronology: callNumberData.chronology,
              copyNumber: callNumberData.copyNumber,
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
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C700864');
    });

    it(
      'C700864 Verify that call numbers with max number of character would be browse (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C700864'] },
      () => {
        // Wait for call number to appear in browse
        BrowseCallNumber.waitForCallNumberToAppear(browseQuery);

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);

        // Step 1: Run browse for call number with maximum characters using "Call numbers (all)" option
        InventorySearchAndFilter.fillInBrowseSearch(browseQuery);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(expectedResult);
        BrowseCallNumber.checkNumberOfTitlesForRow(expectedResult, 1);
        BrowseCallNumber.checkNumberOfTitlesForRow(expectedResult, callNumberData.instanceTitle);

        // Step 2: Select "Library of Congress classification" browse option and run the same search
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        );
        InventorySearchAndFilter.fillInBrowseSearch(browseQuery);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(expectedResult);
        BrowseCallNumber.checkNumberOfTitlesForRow(expectedResult, 1);
        BrowseCallNumber.checkNumberOfTitlesForRow(expectedResult, callNumberData.instanceTitle);
      },
    );
  });
});
