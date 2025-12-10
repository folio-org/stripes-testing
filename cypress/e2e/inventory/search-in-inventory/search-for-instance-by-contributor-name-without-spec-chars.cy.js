import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
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
    'hasidic new wave (musical group)',
    'HASIDIC NEW WAVE (MUSICAL GROUP)',
    'Hasidic New Wave (Musical Group)',
    'Hasidic New Wave',
    'Musical Group Hasidic Wave New',
    'Hasidic : New Wave (Musical group)',
    'Hasidic & New Wave (Musical group)',
    'Hasidic / New Wave (Musical group)',
    'Hasidic \\New Wave (Musical group)',
    'Hasidic New Wave (Musical group);',
    '...Hasidic New Wave Musical group',
    '[Hasidic] New Wave (Musical group)',
  ],
  negativeSearchQueries: [
    'Hasidic Newwave (Musical group)',
    'Hasidic - New Wave (Musical group)',
    '. Hasidic New Wave Musical group  ',
    'Hasidic New Wave (Musical group) album',
    'Hasidic N.W. (Mg)',
  ],

  searchResults: [
    'MSEARCH-466 Title 1 search for "Instance" by "Contributor name" field without special characters',
    'MSEARCH-466 Title 2 search for "Instance" by "Contributor name" field without special characters',
    'MSEARCH-466 Title 3 search for "Instance" by "Contributor name" field without special characters',
  ],
  marcFile: {
    marc: 'marcBibC368475.mrc',
    fileName: `testMarcFileC368475.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numberOfRecords: 3,
    propertyName: 'instance',
  },
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        testData.marcFile.jobProfileToRun,
      ).then((response) => {
        response.forEach((record) => {
          testData.instanceIDs.push(record[testData.marcFile.propertyName].id);
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
      'C958463 Search for "Instance" by "Contributor name" field without special characters using "Keyword" search option (spitfire) (TaaS)',
      { tags: ['criticalPathFlaky', 'spitfire', 'C958463'] },
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

        InventoryInstances.searchByTitle('Hasidic New Wave (Musical Group) from NY');
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[2], true);
      },
    );
  });
});
