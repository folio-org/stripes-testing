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
    'jurassic park the truth is terrifying',
    'JURASSIC PARK THE TRUTH IS TERRIFYING',
    'Jurassic Park The Truth Is Terrifying',
    'Jurassic Park',
    'Terrifying truth Jurassic Park',
    'Jurassic  Park : the truth is terrifying',
    'Jurassic  Park & the truth is terrifying',
    'Jurassic  Park / the truth is terrifying',
    'Jurassic Park /the truth is terrifying',
    'Jurassic Park the truth is terrifying;',
    '...Jurassic Park the truth is terrifying',
  ],

  negativeSearchQueries: [
    'Jurassicpark the truth is terrifying',
    'Jurassic  Park \\ the truth is terrifying',
    '. Jurassic Park the truth is terrifying  ',
    '(Jurassic Park ) the truth is terrifying',
    'Jurassic Park the truth is NOT terrifying',
    'J. P. the truth is terrifying',
  ],

  searchResults: [
    'JURASSIC PARK THE TRUTH IS TERRIFYING edited by Nicolas Michaud and Jessica Watkins',
    'jurassic park the truth is terrifying edited by Nicolas Michaud and Jessica Watkins',
    'Jurassic Park And Philosophy The Truth Is Terrifying edited by Nicolas Michaud and Jessica Watkins',
  ],
  marcFile: {
    marc: 'marcBibC368046.mrc',
    fileName: `testMarcFileC368046.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numberOfRecords: 3,
    propertyName: 'instance',
  },
};

describe('Inventory', () => {
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
        response.forEach((record) => {
          testData.instanceIDs.push(record[testData.marcFile.propertyName].id);
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
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

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.instanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C958461 Search for "Instance" by "Index title" field without special characters using "Keyword" search option (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C958461', 'eurekaPhase1'] },
      () => {
        testData.positiveSearchQueries.forEach((query) => {
          InventoryInstances.searchByTitle(query);
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.byShared('No');
          });
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

        InventoryInstances.searchByTitle('Jurassic Park And Philosophy The Truth Is Terrifying');
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[2], true);
      },
    );
  });
});
