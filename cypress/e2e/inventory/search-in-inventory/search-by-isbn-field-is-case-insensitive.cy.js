import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
      const testData = {
        defaultSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
        isbnOption: 'ISBN',
        identifierAllOption: 'Identifier (all)',
        allOption: 'All',
        searchQueries: ['016037622X', '016037622x'],
        searchResults: [
          'C466070 Instance 1, ISBN lower case',
          'C466070 Instance 2, ISBN UPPER case',
        ],
      };
      // create an array of file names
      const mrkFiles = Array.from({ length: 2 }, (_, i) => `marcBibFileForC466070_${i + 1}.mrk`);
      const createdRecordIDs = [];

      before(() => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          mrkFiles.forEach((mrkFile) => {
            InventoryInstances.createMarcBibliographicRecordViaApiByReadingFromMrkFile(
              mrkFile,
            ).then((createdMarcBibliographicId) => {
              createdRecordIDs.push(createdMarcBibliographicId);
            });
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after(() => {
        cy.getAdminToken();
        createdRecordIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C466070 Search by "ISBN" field is case-insensitive (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C466070'] },
        () => {
          InventorySearchAndFilter.instanceTabIsDefault();
          InventoryInstances.verifySelectedSearchOption(testData.defaultSearchOption);
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.selectSearchOptions(testData.identifierAllOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.selectSearchOptions(testData.isbnOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.selectSearchOptions(testData.allOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          });
          InventoryInstances.verifySelectedSearchOption(testData.defaultSearchOption);

          // if clicked too fast, previous search may be executed for Holdings
          cy.wait(1000);

          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          InventorySearchAndFilter.verifyResultPaneEmpty();
          InventorySearchAndFilter.verifySearchFieldIsEmpty();
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.selectSearchOptions(testData.isbnOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          });
          InventoryInstances.verifySelectedSearchOption(testData.defaultSearchOption);

          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          InventorySearchAndFilter.verifyResultPaneEmpty();
          InventorySearchAndFilter.verifySearchFieldIsEmpty();
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.selectSearchOptions(testData.isbnOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          });
        },
      );
    });
  });
});
