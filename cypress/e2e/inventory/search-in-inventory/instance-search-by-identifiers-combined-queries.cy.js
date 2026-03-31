import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
  searchHoldingsOptions,
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../support/utils/stringTools';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = `cninefiveseventhreeeightfour${getRandomLetters(10)}`;
    const randomDigits = `957384${randomNDigitNumber(10)}`;
    const testData = {
      instanceTitlePrefix: `AT_C957384_FolioInstance_${randomPostfix}`,
      user: {},
      identifierTypeName: 'OCLC',
      keywordSearchOptionInstances: searchInstancesOptions[0],
      keywordSearchOptionHoldings: searchHoldingsOptions[0],
      keywordSearchOptionItems: searchItemsOptions[0],
    };
    const instancesData = [
      {
        title: `Semantic${randomLetters} Web Primer`,
        contributorValue: `Van${randomLetters} Harmelen${randomLetters}, Frank`,
        identifierValue: `ocm${randomDigits}0012345`,
      },
      {
        title: `Amending cis${randomLetters}`,
        contributorValue: null,
        identifierValue: `${randomDigits}2004262156`,
      },
      {
        title: `Cis${randomLetters} Company${randomLetters}`,
        contributorValue: null,
        identifierValue: `cis${randomLetters} ${randomDigits}2004262156`,
      },
    ];
    const searchData = [
      {
        query: `semantic${randomLetters} Van${randomLetters} Harmelen${randomLetters} ocm${randomDigits}0012345`,
        expectedTitles: [],
      },
      {
        query: `semantic${randomLetters} Van${randomLetters} Harmelen${randomLetters}`,
        expectedTitles: [instancesData[0].title],
      },
      {
        query: `cis${randomLetters} ${randomDigits}2004262156`,
        expectedTitles: [instancesData[2].title],
      },
      {
        query: `ocm${randomDigits}0012345`,
        expectedTitles: [instancesData[0].title],
      },
      {
        query: `${randomDigits}2004262156`,
        expectedTitles: [instancesData[1].title, instancesData[2].title],
      },
      {
        query: `Cis${randomLetters} Company${randomLetters}`,
        expectedTitles: [instancesData[2].title],
      },
    ];
    const capabSetsToAssign = [CapabilitySets.uiInventoryInstanceView];
    const instanceIds = [];
    let instanceTypeId;
    let identifierTypeId;
    let contributorNameTypeId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('*cninefiveseventhreeeightfour*');
      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        InventoryInstances.getIdentifierTypes({
          query: `name=="${testData.identifierTypeName}"`,
        }).then((identifierType) => {
          identifierTypeId = identifierType.id;
        });
        BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
          contributorNameTypeId = contributorNameTypes[0].id;
        });
      })
        .then(() => {
          instancesData.forEach((instance) => {
            const instanceParams = {
              instanceTypeId,
              title: instance.title,
              identifiers: [
                {
                  value: instance.identifierValue,
                  identifierTypeId,
                },
              ],
            };
            if (instance.contributorValue) {
              instanceParams.contributors = [
                {
                  name: instance.contributorValue,
                  contributorNameTypeId,
                },
              ];
            }
            InventoryInstances.createFolioInstanceViaApi({
              instance: instanceParams,
            }).then((instanceData) => {
              instanceIds.push(instanceData.instanceId);
            });
          });
        })
        .then(() => {
          cy.createTempUser([])
            .then((userProperties) => {
              testData.user = userProperties;

              cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
            })
            .then(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventorySearchAndFilter.instanceTabIsDefault();
              InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
                testData.keywordSearchOptionInstances,
              );
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
      'C957384 Verify keyword search behavior with identifiers using combined search queries (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C957384'] },
      () => {
        function searchAndCheck() {
          searchData.forEach(({ query, expectedTitles }) => {
            InventorySearchAndFilter.executeSearch(query);

            InventorySearchAndFilter.clickSearch();
            if (!expectedTitles.length) {
              InventorySearchAndFilter.verifyResultPaneEmpty({
                noResultsFound: true,
                searchQuery: query,
              });
            } else {
              instancesData.forEach((instance) => {
                const isExpected = expectedTitles.includes(instance.title);
                InventorySearchAndFilter.verifySearchResult(instance.title, isExpected);
              });
              InventorySearchAndFilter.verifyNumberOfSearchResults(expectedTitles.length);
            }
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          });
        }

        searchAndCheck();

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
          testData.keywordSearchOptionHoldings,
        );
        InventorySearchAndFilter.checkSearchQueryText('');

        searchAndCheck();

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
          testData.keywordSearchOptionItems,
        );
        InventorySearchAndFilter.checkSearchQueryText('');

        searchAndCheck();
      },
    );
  });
});
