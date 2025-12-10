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
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numberOfRecords: 3,
    propertyName: 'instance',
  },
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      testData.searchResults.forEach((title) => {
        InventoryInstances.deleteInstanceByTitleViaApi(title);
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
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
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
      'C958462 Search for "Instance" by "Series statement" field without special characters using "Keyword" search option (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C958462', 'eurekaPhase1'] },
      () => {
        testData.positiveSearchQueries.forEach((query) => {
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.byShared('No');
            InventorySearchAndFilter.verifyResultListExists();
            InventorySearchAndFilter.clickAccordionByName('Shared');
            InventorySearchAndFilter.verifyAccordionByNameExpanded('Shared', false);
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
            InventorySearchAndFilter.byShared('No');
            InventorySearchAndFilter.verifyResultListExists();
            InventorySearchAndFilter.clickAccordionByName('Shared');
            InventorySearchAndFilter.verifyAccordionByNameExpanded('Shared', false);
          });
          InventoryInstances.searchByTitle(query, false);
          InventorySearchAndFilter.verifyNoRecordsFound();
          InventoryInstances.resetAllFilters();
        });

        cy.ifConsortia(true, () => {
          InventorySearchAndFilter.byShared('No');
          InventorySearchAndFilter.verifyResultListExists();
        });
        InventoryInstances.searchByTitle('Philippine Question Books No 10 in catalog');
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[2], true);
      },
    );
  });
});
