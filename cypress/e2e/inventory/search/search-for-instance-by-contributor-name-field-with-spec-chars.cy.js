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
  searchQueries: [
    'Arroyo Center 1984 Force Development Technology Program',
    'Arroyo Center 1984 Force Development & Technology Program',
    'Arroyo Center : 1984 Force Development Technology Program',
    '"Arroyo Center" 1984 / Force-Development {Technology Program}',
    'Arroyo Center: 1984 Force/ Development&Technology Program',
    'Technology Program : (Force Development) Arroyo Center "1984".',
  ],
  searchResults: [
    'Arroyo Center 1984 Force Development and Technology Program',
    'Arroyo Center 1984 Force Development & Technology Program',
    'Arroyo Center : 1984 Force Development Technology Program',
    '"Arroyo Center" 1984 / Force-Development {Technology Program}',
    '.Arroyo Center - 1984 Force Development [Technology] Program !',
    'Arroyo Center & 1984 Force Development : Technology / (Program for gov)',
    'Arroyo Center 1984 Force Development Technology Program',
    'Arroyo Center: 1984 Force/ Development&Technology Program',
  ],
  marcFile: {
    marc: 'marcBibC368043.mrc',
    fileName: `testMarcFileC368043.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    numberOfRecords: 8,
    propertyName: 'relatedInstanceInfo',
  },
};

describe('inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.uploadFileViaApi(
          testData.marcFile.marc,
          testData.marcFile.fileName,
          testData.marcFile.jobProfileToRun,
        ).then((response) => {
          response.entries.forEach((record) => {
            testData.instanceIDs.push(record[testData.marcFile.propertyName].idList[0]);
          });
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
      'C368043 Search for "Instance" by "Contributor name" field with special characters using "Keyword" search option (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        testData.searchQueries.forEach((query) => {
          InventoryInstances.searchByTitle(query);
          InventorySearchAndFilter.checkRowsCount(8);
          testData.searchResults.forEach((result) => {
            InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
          });
          InventoryInstances.resetAllFilters();
        });

        InventoryInstances.searchByTitle(
          'Arroyo Center 1984 Force Development and Technology Program',
        );
        InventorySearchAndFilter.checkRowsCount(3);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[0], true);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[1], true);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[5], true);

        InventoryInstances.resetAllFilters();
        InventoryInstances.searchByTitle(
          'Arroyo Center & 1984 Force Development : Technology / (Program for gov)',
        );
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[5], true);

        InventoryInstances.resetAllFilters();
        InventoryInstances.searchByTitle(
          '.Arroyo Center - 1984 Force Development [Technology] Program !',
          false,
        );
        InventorySearchAndFilter.verifyNoRecordsFound();
      },
    );
  });
});
