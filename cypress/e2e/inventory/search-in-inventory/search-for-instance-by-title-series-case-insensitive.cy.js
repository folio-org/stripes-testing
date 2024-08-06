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
  titleAllSearchOption: 'Title (all)',
  allSearchOption: 'All',
  searchQueries: ['CASE TITLE TEST', 'case test title'],
  searchResulsAllInstances: [
    'C466069 Instance 1, Title field lower case: case test title',
    'C466069 Instance 2, Title field UPPER case: CASE TEST TITLE',
    'C466069 Instance 3, Alternative title field lower case',
    'C466069 Instance 4, Alternative title field UPPER case',
    'C466069 Instance 5, Series field lower case',
    'C466069 Instance 6, Series field UPPER case',
  ],

  marcFile: {
    marc: 'marcBibFileC466069.mrc',
    fileName: `testMarcFileC466069.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    numberOfRecords: 6,
    propertyName: 'instance',
  },
};

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
      before('Create test data, login', () => {
        cy.getAdminToken();
        InventoryInstances.getInstancesViaApi({
          limit: 100,
          query: 'title="C466069 Instance"',
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

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
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
        'C466069 Search by "Title", "Alternative title", "Series" fields is case-insensitive (spitfire)',
        { tags: ['criticalPathFlaky', 'spitfire'] },
        () => {
          testData.searchQueries.forEach((query) => {
            InventoryInstances.searchByTitle(query);
            testData.searchResulsAllInstances.forEach((result) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
            });
            InventoryInstances.resetAllFilters();
          });

          testData.searchQueries.forEach((query) => {
            InventoryInstances.searchInstancesWithOption(testData.titleAllSearchOption, query);
            testData.searchResulsAllInstances.forEach((result) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
            });
            InventoryInstances.resetAllFilters();
          });

          testData.searchQueries.forEach((query) => {
            InventoryInstances.searchInstancesWithOption(testData.allSearchOption, query);
            testData.searchResulsAllInstances.forEach((result) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
            });
            InventoryInstances.resetAllFilters();
          });
        },
      );
    });
  });
});
