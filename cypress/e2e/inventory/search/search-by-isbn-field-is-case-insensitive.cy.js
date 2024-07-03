import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

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

      const marcFile = {
        marc: 'marcBibFileForC466070.mrc',
        fileName: `testMarcFileC466070.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };

      const createdRecordIDs = [];

      before(() => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[marcFile.propertyName].id);
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
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          InventorySearchAndFilter.instanceTabIsDefault();
          InventoryInstances.verifySelectedSearchOption(testData.defaultSearchOption);
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.identifierAllOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.isbnOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.allOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });

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
          });
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
          });
        },
      );
    });
  });
});
