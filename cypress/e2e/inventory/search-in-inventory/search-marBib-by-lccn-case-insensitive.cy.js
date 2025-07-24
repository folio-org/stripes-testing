import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Case-insensitive checks', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        queries: ['N790214265466072', 'n790214265466072'],
        searchOptions: [
          'Keyword (title, contributor, identifier, HRID, UUID)',
          'Identifier (all)',
          'LCCN, normalized',
          'All',
        ],
      };
      const instanceTitlePrefix = `AT_C466072_MarcBibInstance_${randomPostfix}`;
      const createdInstanceIds = [];

      before(() => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          for (let i = 0; i < 2; i++) {
            // Create MARC bibliographic records
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
              {
                tag: '008',
                content: QuickMarcEditor.defaultValid008Values,
              },
              {
                tag: '245',
                content: `$a ${instanceTitlePrefix}_${i}`,
                indicators: ['1', '1'],
              },
              {
                tag: '010',
                content: `$a ${testData.queries[i]}`,
                indicators: ['\\', '\\'],
              },
            ]).then((instanceId) => {
              createdInstanceIds.push(instanceId);
            });
          }
        });
      });

      after(() => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        createdInstanceIds.forEach((instanceId) => {
          InventoryInstance.deleteInstanceViaApi(instanceId);
        });
      });

      it(
        'C466072 Search by "LCCN" field is case-insensitive (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C466072'] },
        () => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          testData.searchOptions.forEach((option) => {
            InventorySearchAndFilter.selectSearchOption(option);

            // Step 1: Search with UPPER case
            InventoryInstances.searchByTitle(testData.queries[0]);
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_0`);
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_1`);

            // Step 2: Reset and search with lower case
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventoryInstances.searchByTitle(testData.queries[1]);
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_0`);
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_1`);

            // Reset for next iteration
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          });
        },
      );
    });
  });
});
