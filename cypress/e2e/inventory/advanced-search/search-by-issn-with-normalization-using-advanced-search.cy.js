import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const testData = {
      instanceTitlePrefix: 'C831999_Instance_Case_1',
      instanceTitles: [],
      issnNumbers: ['0044-8286', '00448286', '0044 8286'],
    };

    const testStepsInstance = [
      {
        name: 'step1',
        rows: [
          {
            row: 0,
            query: '0044-8286',
            matchOption: 'Exact phrase',
            searchOption: 'ISSN',
          },
        ],
      },
      {
        name: 'step2',
        rows: [
          {
            row: 0,
            query: '00448286',
            matchOption: 'Contains all',
            searchOption: 'ISSN',
          },
        ],
      },
      {
        name: 'step3',
        rows: [
          {
            row: 0,
            query: '0044 8286',
            matchOption: 'Starts with',
            searchOption: 'ISSN',
          },
        ],
      },
      {
        name: 'step4',
        rows: [
          {
            row: 0,
            query: '0044-8286',
            matchOption: 'Contains any',
            searchOption: 'ISSN',
          },
        ],
      },
      {
        name: 'step5',
        rows: [
          {
            row: 0,
            query: '0044-8286',
            matchOption: 'Contains any',
            searchOption: 'Keyword (title, contributor, identifier)',
          },
        ],
      },
      {
        name: 'step6',
        rows: [
          {
            row: 0,
            query: '0044 8286',
            matchOption: 'Contains all',
            searchOption: 'Identifier (all)',
          },
        ],
      },
    ];

    const testStepsHoldings = [
      {
        name: 'step8',
        rows: [{ row: 0, query: '0044-8286', matchOption: 'Contains all', searchOption: 'ISSN' }],
      },
      {
        name: 'step9',
        rows: [
          {
            row: 0,
            query: '0044-8286',
            matchOption: 'Exact phrase',
            searchOption: 'Keyword (title, contributor, identifier)',
          },
        ],
      },
    ];

    const testStepsItem = [
      {
        name: 'step11',
        rows: [{ row: 0, query: '0044-8286', matchOption: 'Contains any', searchOption: 'ISSN' }],
      },
      {
        name: 'step12',
        rows: [
          {
            row: 0,
            query: '00448286',
            matchOption: 'Starts with',
            searchOption: 'Keyword (title, contributor, identifier)',
          },
        ],
      },
    ];

    const instanceIds = [];
    let instanceTypeId;
    let issnTypeId;

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitlePrefix);

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        InventoryInstances.getIdentifierTypes({ query: 'name="ISSN"' }).then((identifier) => {
          issnTypeId = identifier.id;
        });
      }).then(() => {
        testData.issnNumbers.forEach((issn, index) => {
          const title = `${testData.instanceTitlePrefix}_${index + 1}`;

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
          })
            .then((instanceData) => {
              instanceIds.push(instanceData.instanceId);
              testData.instanceTitles.push(title);
            })
            .then(() => {
              // adding expected results for steps with only 1 result
              testStepsInstance.find((s) => s.name === 'step5').expectedResults = [
                testData.instanceTitles[0],
              ];
              testStepsInstance.find((s) => s.name === 'step6').expectedResults = [
                testData.instanceTitles[2],
              ];
              testStepsHoldings.find((s) => s.name === 'step9').expectedResults = [
                testData.instanceTitles[0],
              ];
              testStepsItem.find((s) => s.name === 'step12').expectedResults = [
                testData.instanceTitles[1],
              ];
            });
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
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C831999 Advanced search | Verify ISSN search normalization - Case 1 (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C831999'] },
      () => {
        // Run searches on Instance tab
        InventorySearchAndFilter.instanceTabIsDefault();
        testStepsInstance.forEach((step) => {
          InventoryInstances.clickAdvSearchButton();
          step.rows.forEach((data) => {
            InventoryInstances.fillAdvSearchRow(
              data.row,
              data.query,
              data.matchOption,
              data.searchOption,
              data.operator,
            );
          });
          InventoryInstances.clickSearchBtnInAdvSearchModal();
          const resultsToCheck = step.expectedResults || testData.instanceTitles;
          resultsToCheck.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
        });

        // Run searches on Holdings tab
        InventorySearchAndFilter.switchToHoldings();
        testStepsHoldings.forEach((step) => {
          InventoryInstances.clickAdvSearchButton();
          step.rows.forEach((data) => {
            InventoryInstances.fillAdvSearchRow(
              data.row,
              data.query,
              data.matchOption,
              data.searchOption,
              data.operator,
            );
          });
          InventoryInstances.clickSearchBtnInAdvSearchModal();
          const resultsToCheck = step.expectedResults || testData.instanceTitles;
          resultsToCheck.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
        });

        // Run searches on Item tab
        InventorySearchAndFilter.switchToItem();
        testStepsItem.forEach((step) => {
          InventoryInstances.clickAdvSearchButton();
          step.rows.forEach((data) => {
            InventoryInstances.fillAdvSearchRow(
              data.row,
              data.query,
              data.matchOption,
              data.searchOption,
              data.operator,
            );
          });
          InventoryInstances.clickSearchBtnInAdvSearchModal();
          const resultsToCheck = step.expectedResults || testData.instanceTitles;
          resultsToCheck.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
        });
      },
    );
  });
});
