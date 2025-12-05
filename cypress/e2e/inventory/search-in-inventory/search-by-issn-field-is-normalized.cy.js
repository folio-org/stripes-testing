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

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = [
      {
        id: 'C831991',
        case: '1',
        instanceTitlePrefix: 'C831991_Instance_Case_1',
        instanceTitles: [],
        issnNumbers: ['0021-8286', '00218286', '0021 8286'],
        searchQueries: ['0021-8286', '00218286', '0021 8286', ' 0021-8286', '0021-8286 '],
      },
      {
        id: 'C831992',
        case: '2',
        instanceTitlePrefix: 'C831992_Instance_Case_2',
        instanceTitles: [],
        issnNumbers: ['0021-828X', '0021828x', '0021 828X'],
        searchQueries: ['0021-828X', '0021828x', '0021 828X', ' 0021-828X', '0021-828X '],
      },
      {
        id: 'C831993',
        case: '3',
        instanceTitlePrefix: 'C831993_Instance_Case_3',
        instanceTitles: [],
        issnNumbers: ['qwert-000z', 'qwert 000z', 'qwert000z'],
        searchQueries: ['qwert-000z', 'qwert 000z', 'qwert000z', ' qwert 000z '],
      },
      {
        id: 'C831994',
        case: '4',
        instanceTitlePrefix: 'C831994_Instance_Case_4',
        instanceTitles: [],
        issnNumbers: ['0222-82-86', '0222 82 86', '02228286'],
        searchQueries: ['0222-82-86', '0222 82 86', '02228286', ' 0222-82-86', '0222-82-86 '],
      },
      {
        id: 'C831996',
        case: '5',
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
        id: 'C831997',
        case: '6',
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
              const title = `${scenario.instanceTitlePrefix}_${index + 1}`;

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

    testData.forEach((scenario) => {
      it(
        `${scenario.id} Verify ISSN search normalization - Case ${scenario.case} (spitfire)`,
        {
          tags: [
            'extendedPath',
            'spitfire',
            'C831991',
            'C831992',
            'C831993',
            'C831994',
            'C831996',
            'C831997',
          ],
        },
        () => {
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
        },
      );
    });
  });
});
