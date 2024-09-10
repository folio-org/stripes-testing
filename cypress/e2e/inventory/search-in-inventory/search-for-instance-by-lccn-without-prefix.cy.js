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
  lccnSearchOption: 'LCCN, normalized',
  searchQueryNumbersOnly: '7902468233',
  searchQueryAsterisk: '*7902468233',
  searchResultsAll: [
    'C468233 Test LCCN normalized record 10 (digits only)',
    'C468233 Test LCCN normalized record 1 (two leading spaces, one trailing space, two internal spaces)',
    'C468233 Test LCCN normalized record 2 (one space internal)',
    'C468233 Test LCCN normalized record 3 (two spaces internal)',
    'C468233 Test LCCN normalized record 4 (one space trailing)',
    'C468233 Test LCCN normalized record 5 (two spaces trailing)',
    'C468233 Test LCCN normalized record 6 (one space leading)',
    'C468233 Test LCCN normalized record 7 (two spaces leading)',
    'C468233 Test LCCN normalized record 8 (two spaces everywhere)',
    'C468233 Test LCCN normalized record 9 (no spaces)',
  ],
  marcFile: {
    marc: 'marcBibFileC468233.mrc',
    fileName: `testMarcBibFileC468233.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
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
          query: 'title="C468233"',
        }).then((instances) => {
          if (instances) {
            instances.forEach(({ id }) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }
        });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            testData.marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.instanceIDs.push(record[testData.marcFile.propertyName].id);
            });
          });

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
        'C468233 Search for "MARC bibliographic" by "LCCN, normalized" option using a query without prefix (numbers only) when "LCCN" (010 $a) has (leading, internal, trailing) spaces. (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          InventorySearchAndFilter.selectSearchOptions(
            testData.lccnSearchOption,
            testData.searchQueryNumbersOnly,
          );
          InventorySearchAndFilter.clickSearch();
          InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResultsAll[0], true);
          InventorySearchAndFilter.checkRowsCount(1);

          InventorySearchAndFilter.selectSearchOptions(
            testData.lccnSearchOption,
            testData.searchQueryAsterisk,
          );
          InventorySearchAndFilter.clickSearch();
          testData.searchResultsAll.forEach((searchResult) => {
            InventorySearchAndFilter.verifyInstanceDisplayed(searchResult, true);
          });
          InventorySearchAndFilter.checkRowsCount(testData.searchResultsAll.length);
        },
      );
    });
  });
});
