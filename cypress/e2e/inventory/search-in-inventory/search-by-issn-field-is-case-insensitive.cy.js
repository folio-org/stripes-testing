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
        issnOption: 'ISSN',
        identifierAllOption: 'Identifier (all)',
        allOption: 'All',
        searchQueries: ['0040-782X', '0040-782x'],
        searchResults: [
          'C466071 (MSEARCH672 test ISSN upper case, record 1) Time.',
          'C466071 (MSEARCH672 test ISSN lower case, record 2) Time.',
          'C466071 (MSEARCH672 test invalid ISSN upper case, record 3) Time.',
          'C466071 (MSEARCH672 test invalid ISSN lower case, record 4) Time.',
          'C466071 (MSEARCH672 test linking ISSN upper case, record 5) Time.',
          'C466071 (MSEARCH672 test linking ISSN lower case, record 6) Time.',
        ],
      };

      const marcFile = {
        marc: 'marcBibFileForC466071.mrc',
        fileName: `testMarcFileC466071.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };

      const createdRecordIDs = [];

      before(() => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.getUserToken(testData.user.username, testData.user.password);
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
        'C466071 Search by "ISSN" field is case-insensitive (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C466071'] },
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
            InventorySearchAndFilter.selectSearchOptions(testData.issnOption, '');
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
            InventorySearchAndFilter.selectSearchOptions(testData.issnOption, '');
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
            InventorySearchAndFilter.selectSearchOptions(testData.issnOption, '');
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
