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
    const testData = {
      issnOption: 'ISSN',
      defaultSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
      issnPositiveSearchQueries: ['0040-782X', '0040-782x', '0040-782*', '*-782x'],
      issnNegativeSearchQuery: '0040-782A',
      searchResults: [
        'C451457 (MSEARCH672 test ISSN upper case, record 1) Time.',
        'C451457 (MSEARCH672 test ISSN lower case, record 2) Time.',
        'C451457 (MSEARCH672 test invalid ISSN upper case, record 3) Time.',
        'C451457 (MSEARCH672 test invalid ISSN lower case, record 4) Time.',
        'C451457 (MSEARCH672 test linking ISSN upper case, record 5) Time.',
        'C451457 (MSEARCH672 test linking ISSN lower case, record 6) Time.',
      ],
    };

    const marcFile = {
      marc: 'marcBibFileForC451457.mrc',
      fileName: `testMarcFileC451457.${getRandomPostfix()}.mrc`,
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
      'C451457 Search for "Instance" record by "ISSN" value with "X" at the end using "ISSN" search option (Instance tab) (spitfire)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.selectSearchOptions(testData.issnOption, '');

        testData.issnPositiveSearchQueries.forEach((query) => {
          InventorySearchAndFilter.executeSearch(query);
          testData.searchResults.forEach((expectedResult) => {
            InventorySearchAndFilter.verifySearchResult(expectedResult);
          });
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventoryInstances.verifySelectedSearchOption(testData.defaultSearchOption);
          InventorySearchAndFilter.verifyResultPaneEmpty();
        });
        InventorySearchAndFilter.executeSearch(testData.issnNegativeSearchQuery);
        InventorySearchAndFilter.verifyNoRecordsFound();
      },
    );
  });
});
