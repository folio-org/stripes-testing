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
        oclcOption: 'OCLC number, normalized',
        identifierAllOption: 'Identifier (all)',
        allOption: 'All',
        searchQueries: ['(OCoLC)wln7986864', '(OCoLC)WLN7986864'],
        searchResultsAll: [
          'C466073 Instance 1, OCLC lower case',
          'C466073 Instance 2, OCLC UPPER case',
          'C466073 Instance 3, OCLC canceled lower case',
          'C466073 Instance 4, OCLC canceled UPPER case',
        ],
        searchResultsTwoRecords: [
          'C466073 Instance 1, OCLC lower case',
          'C466073 Instance 2, OCLC UPPER case',
        ],
      };

      const marcFile = {
        marc: 'marcBibFileForC466073.mrc',
        fileName: `testMarcFileC466073.${getRandomPostfix()}.mrc`,
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
        'C466073 Search by "OCLC" field is case-insensitive (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C466073'] },
        () => {
          InventorySearchAndFilter.instanceTabIsDefault();
          InventoryInstances.verifySelectedSearchOption(testData.defaultSearchOption);
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResultsAll.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.identifierAllOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResultsAll.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.oclcOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResultsTwoRecords.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
          testData.searchQueries.forEach((query) => {
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.selectSearchOptions(testData.allOption, '');
            InventorySearchAndFilter.executeSearch(query);
            testData.searchResultsAll.forEach((expectedResult) => {
              InventorySearchAndFilter.verifySearchResult(expectedResult);
            });
          });
        },
      );
    });
  });
});
