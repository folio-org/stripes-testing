import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  user: {},
  instanceIDs: [],
  positiveSearchQueries: [
    'philippine question books no 10',
    'PHILIPPINE QUESTION BOOKS NO 10',
    'Philippine Question Books No 10',
    'Philippine Question',
    '10 books No Philippine Question',
    'Philippine Question : books No 10',
    'Philippine Question & books No 10',
    'Philippine Question / books No 10',
    'Philippine Question\\ books No 10',
    'Philippine Question books No 10;',
    '...Philippine Question books No 10"',
    '(Philippine Question) books No 10',
  ],

  negativeSearchQueries: [
    'Philippinequestion Books No 10',
    'Philippine Question ? books No 10"',
    '. Philippine Question books No 10  ',
    'Philippine Question New books No 10',
    'P.Q. books No 10',
  ],

  searchResults: [
    'MSEARCH-466 Title 1: search for "Instance" by "Series statement" field without special characters',
    'MSEARCH-466 Title 2: search for "Instance" by "Series statement" field without special characters',
    'MSEARCH-466 Title 3: search for "Instance" by "Series statement" field without special characters',
  ],
  marcFile: {
    marc: 'marcBibC368048.mrc',
    fileName: `testMarcFileC368048.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    numberOfRecords: 3,
    propertyName: 'relatedInstanceInfo',
  },
};

describe('inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.getInstancesViaApi({
        limit: 100,
        query: `title="${testData.positiveSearchQueries[0]}"`,
      }).then((instances) => {
        if (instances) {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        }
      });

      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        testData.marcFile.jobProfileToRun,
      ).then((response) => {
        response.entries.forEach((record) => {
          testData.instanceIDs.push(record[testData.marcFile.propertyName].idList[0]);
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.instanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C368048 Search for "Instance" by "Series statement" field without special characters using "Keyword" search option (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        testData.positiveSearchQueries.forEach((query) => {
          InventoryInstances.searchByTitle(query);
          InventorySearchAndFilter.checkRowsCount(3);
          testData.searchResults.forEach((result) => {
            InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
          });
          InventoryInstances.resetAllFilters();
        });

        testData.negativeSearchQueries.forEach((query) => {
          InventoryInstances.searchByTitle(query, false);
          InventorySearchAndFilter.verifyNoRecordsFound();
          InventoryInstances.resetAllFilters();
        });

        InventoryInstances.searchByTitle('Philippine Question Books No 10 in catalog');
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[2], true);
      },
    );
  });
});
