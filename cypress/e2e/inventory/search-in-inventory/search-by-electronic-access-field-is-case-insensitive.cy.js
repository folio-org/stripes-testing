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
        querySearchOption: 'Query search',
        allOption: 'All',
        searchQueriesURI: ['WWW.INSTANCECASE.COM/TEST/URI', 'www.instancecase.com/test/uri'],
        searchQueriesLinkText: ['INSTANCE LINK TEXT CASE TEST', 'instance link text case test'],
        searchQueriesMaterialSpecified: [
          'INSTANCE MATERIALS CASE TEST',
          'instance materials case test',
        ],
        searchQueriesUrlPublicNote: [
          'INSTANCE PUBLIC NOTE CASE TEST',
          'instance public note case test',
        ],
        searchResults: [
          'C466077 Instance 1, Electronic access lower case test',
          'C466077 Instance 2, Electronic access UPPER case test',
        ],
      };

      const marcFile = {
        marc: 'marcBibFileForC466077.mrc',
        fileName: `testMarcFileC466077.${getRandomPostfix()}.mrc`,
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

          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
            InventoryInstances.waitContentLoading();
          }, 20_000);
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
        'C466077 Search by "Electronic access" field of "Instance" record is case-insensitive (spitfire)',
        { tags: ['criticalPathFlaky', 'spitfire', 'C466077'] },
        () => {
          InventorySearchAndFilter.instanceTabIsDefault();
          InventorySearchAndFilter.selectSearchOptions(testData.allOption, '');
          InventorySearchAndFilter.executeSearch(testData.searchQueriesURI[0]);
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.selectSearchOptions(testData.allOption, '');
          InventorySearchAndFilter.executeSearch(testData.searchQueriesURI[1]);
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          testData.searchQueriesLinkText.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.allOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueriesMaterialSpecified.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.allOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueriesUrlPublicNote.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.allOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueriesURI.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.querySearchOption, '');
            InventorySearchAndFilter.executeSearch(`electronicAccess any "${query}"`);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueriesLinkText.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.querySearchOption, '');
            InventorySearchAndFilter.executeSearch(`electronicAccess any "${query}"`);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueriesMaterialSpecified.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.querySearchOption, '');
            InventorySearchAndFilter.executeSearch(`electronicAccess any "${query}"`);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueriesUrlPublicNote.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.querySearchOption, '');
            InventorySearchAndFilter.executeSearch(`electronicAccess any "${query}"`);
            testData.searchResults.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
        },
      );
    });
  });
});
