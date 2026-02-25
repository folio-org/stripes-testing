import { Permissions } from '../../../support/dictionary';
import InventoryInstances, {
  searchInstancesOptions,
  searchHoldingsOptions,
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import inventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const testData = [
      {
        instanceTitlePrefix: 'C831991_Instance_Case_1',
        instanceTitles: [],
        issnNumbers: ['0021-8286', '00218286', '0021 8286'],
        searchQueries: ['0021-8286', '00218286', '0021 8286', ' 0021-8286', '0021-8286 '],
      },
      {
        instanceTitlePrefix: 'C831992_Instance_Case_2',
        instanceTitles: [],
        issnNumbers: ['0021-828X', '0021828x', '0021 828X'],
        searchQueries: ['0021-828X', '0021828x', '0021 828X', ' 0021-828X', '0021-828X '],
      },
      {
        instanceTitlePrefix: 'C831993_Instance_Case_3',
        instanceTitles: [],
        issnNumbers: ['qwert-000z', 'qwert 000z', 'qwert000z'],
        searchQueries: ['qwert-000z', 'qwert 000z', 'qwert000z', ' qwert 000z '],
      },
      {
        instanceTitlePrefix: 'C831994_Instance_Case_4',
        instanceTitles: [],
        issnNumbers: ['0222-82-86', '0222 82 86', '02228286'],
        searchQueries: ['0222-82-86', '0222 82 86', '02228286', ' 0222-82-86', '0222-82-86 '],
      },
      {
        instanceTitlePrefix: 'C831996_Instance_Case_5',
        instanceTitles: [],
        issnNumbers: ['0023-82-8600', '0023 82 8600', '0023828600'],
        searchQueries: [
          '0023-82-8600',
          '0023 82 8600',
          '0023828600',
          ' 0023-82-8600',
          '0023-82-8600 ',
        ],
      },
      {
        instanceTitlePrefix: 'C831996_Instance_Case_6',
        instanceTitles: [],
        issnNumbers: ['803-261-6261', '803 261 6261', '8032616261'],
        searchQueries: [
          '803-261-6261',
          '803 261 6261',
          '8032616261',
          ' 803-261-6261',
          '803-261-6261 ',
        ],
      },
    ];

    const searchOptions = {
      instance: [
        `${searchInstancesOptions[0]}`, // Keyword
        `${searchInstancesOptions[3]}`, // Identifier(all)
        `${searchInstancesOptions[6]}`, // ISSN
      ],
      holdings: [
        `${searchHoldingsOptions[0]}`, // Keyword
        `${searchHoldingsOptions[2]}`, // ISSN
      ],
      items: [
        `${searchItemsOptions[0]}`, // Keyword
        `${searchItemsOptions[3]}`, // ISSN
      ],
    };

    function runTest(scenario) {
      // Run searches on Instance tab
      scenario.searchQueries.forEach((query) => {
        searchOptions.instance.forEach((option) => {
          inventorySearchAndFilter.searchByParameter(option, query);
          scenario.instanceTitles.forEach((title) => {
            inventorySearchAndFilter.verifySearchResult(title);
          });
        });
      });

      // Run searches on Holdings tab
      inventorySearchAndFilter.switchToHoldings();
      scenario.searchQueries.forEach((query) => {
        searchOptions.holdings.forEach((option) => {
          inventorySearchAndFilter.searchByParameter(option, query);
          scenario.instanceTitles.forEach((title) => {
            inventorySearchAndFilter.verifySearchResult(title);
          });
        });
      });

      // Run searches on Item tab
      inventorySearchAndFilter.switchToItem();
      scenario.searchQueries.forEach((query) => {
        searchOptions.items.forEach((option) => {
          inventorySearchAndFilter.searchByParameter(option, query);
          scenario.instanceTitles.forEach((title) => {
            inventorySearchAndFilter.verifySearchResult(title);
          });
        });
      });
      inventorySearchAndFilter.switchToInstance();
    }

    const instanceIds = [];
    let instanceTypeId;
    let issnTypeId;
    let user;

    before('Create test data and login', () => {
      cy.getAdminToken();
      testData.forEach((scenario) => {
        InventoryInstances.deleteFullInstancesByTitleViaApi(scenario.instanceTitlePrefix);
      });

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        InventoryInstances.getIdentifierTypes({ query: 'name="ISSN"' }).then((identifier) => {
          issnTypeId = identifier.id;
        });
      })
        .then(() => {
          testData.forEach((scenario) => {
            scenario.issnNumbers.forEach((issn, index) => {
              const title = `${scenario.instanceTitlePrefix}_${randomPostfix}_${index + 1}`;

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  title,
                  identifiers: [
                    {
                      value: issn,
                      identifierTypeId: issnTypeId,
                    },
                  ],
                  instanceTypeId,
                },
              }).then((instanceData) => {
                instanceIds.push(instanceData.instanceId);
                scenario.instanceTitles.push(title);
              });
            });
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
            user = userProperties;
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C831991 Verify ISSN search normalization - Case 1 (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C831991'] },
      () => {
        runTest(testData[0]);
      },
    );

    it(
      'C831992 Verify ISSN search normalization - Case 2 (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C831992'] },
      () => {
        runTest(testData[1]);
      },
    );

    it(
      'C831993 Verify ISSN search normalization - Case 3 (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C831993'] },
      () => {
        runTest(testData[2]);
      },
    );

    it(
      'C831994 Verify ISSN search normalization - Case 4 (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C831994'] },
      () => {
        runTest(testData[3]);
      },
    );

    it(
      'C831996 Verify ISSN search normalization - Case 5 (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C831996'] },
      () => {
        runTest(testData[4]);
      },
    );

    it(
      'C831997 Verify ISSN search normalization - Case 6 (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C831997'] },
      () => {
        runTest(testData[5]);
      },
    );
  });
});
