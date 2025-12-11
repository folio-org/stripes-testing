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
    'fight club by chuck palahniuk',
    'FIGHT CLUB BY CHUCK PALAHNIUK',
    'Fight Club By Chuck Palahniuk',
    'Palahniuk',
    'Fight Club Chuck Palahniuk',
    'Palahniuk Fight Club',
    'Fight club by : Chuck  Palahniuk',
    'Fight club by / Chuck  Palahniuk',
    'Fight club by & Chuck  Palahniuk',
    'Fight club by \\Chuck Palahniuk',
    'Fight club by Chuck Palahniuk;',
    '...Fight club by Chuck Palahniuk  ',
  ],
  negativeSearchQueries: [
    'Fightclub by Chuck Palahniuk',
    'Fight club by \\ Chuck Palahniuk',
    '. Fight club by Chuck Palahniuk',
    'Fight club by (Chuck Palahniuk )',
    'Fight club by Chuck Palahniuk author123',
    'Fight club by Ch. P.',
  ],

  searchResults: [
    'fight club by chuck palahniuk',
    'FIGHT CLUB BY CHUCK PALAHNIUK',
    'Fight Club By Writer Chuck Palahniuk',
  ],
  marcFile: {
    marc: 'marcBibC368026.mrc',
    fileName: `testMarcFileC368026.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numberOfRecords: 3,
    propertyName: 'instance',
  },
  sharedAccordionName: 'Shared',
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.getInstancesViaApi({
        limit: 100,
        query: 'title="fight club"',
      }).then((instances) => {
        if (instances) {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        }
      });
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.getUserToken(testData.user.username, testData.user.password);
        DataImport.uploadFileViaApi(
          testData.marcFile.marc,
          testData.marcFile.fileName,
          testData.marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            testData.instanceIDs.push(record[testData.marcFile.propertyName].id);
          });
        });
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
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
      'C958458 Search for "Instance" by "Title" field without special characters using "Keyword" search option (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire', 'C958458', 'eurekaPhase1'] },
      () => {
        testData.positiveSearchQueries.forEach((query) => {
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.byShared('No');
            InventoryInstances.waitLoading();
          });
          InventoryInstances.searchByTitle(query);
          InventorySearchAndFilter.checkRowsCount(3);
          testData.searchResults.forEach((result) => {
            InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
          });
          InventoryInstances.resetAllFilters();
        });

        testData.negativeSearchQueries.forEach((query) => {
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(
              testData.sharedAccordionName,
              false,
            );
            InventorySearchAndFilter.byShared('No');
            InventoryInstances.waitLoading();
          });
          InventoryInstances.searchByTitle(query, false);
          InventorySearchAndFilter.verifyNoRecordsFound();
          InventoryInstances.resetAllFilters();
        });

        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.clickAccordionByName(testData.sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(
            testData.sharedAccordionName,
            false,
          );
          InventorySearchAndFilter.byShared('No');
          InventoryInstances.waitLoading();
        });
        InventoryInstances.searchByTitle('Fight Club by writer Chuck Palahniuk');
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[2], true);
      },
    );
  });
});
