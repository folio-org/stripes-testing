import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
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
      };

      const mrkFiles = Array.from({ length: 10 }, (_, i) => `marcBibFileC468233_${i + 1}.mrk`);

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

        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.marcRecordsEditorAll.gui,
        ]).then((userProperties) => {
          testData.userForCreate = userProperties;
          cy.getUserToken(testData.userForCreate.username, testData.userForCreate.password);
          mrkFiles.forEach((mrkFile) => {
            InventoryInstances.createMarcBibliographicRecordViaApiByReadingFromMrkFile(
              mrkFile,
            ).then((createdMarcBibliographicId) => {
              testData.instanceIDs.push(createdMarcBibliographicId);
            });
          });

          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties2) => {
            testData.user = userProperties2;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        Users.deleteViaApi(testData.userForCreate.userId);
        testData.instanceIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C468233 Search for "MARC bibliographic" by "LCCN, normalized" option using a query without prefix (numbers only) when "LCCN" (010 $a) has (leading, internal, trailing) spaces. (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C468233'] },
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
