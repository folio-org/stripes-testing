import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';
import { ADVANCED_SEARCH_MODIFIERS } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Inventory', () => {
  describe('Advanced search', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = `${randomNDigitNumber(6)}`;
    const testData = {
      isbnSearchOption: 'ISSN',
      identifierTypeName: 'ISSN',
      titlePrefix: `AT_C1030060_FolioInstance_${randomPostfix}`,
    };
    const isbnNumbers = [
      `01030060-${randomDigits}X`,
      `0600301-${randomDigits.split('').reverse().join('')}`,
      `${randomDigits}1030060`,
    ];
    const instanceTitles = Array.from(
      { length: isbnNumbers.length },
      (_, i) => `${testData.titlePrefix}_${i}`,
    );
    const searchData = [
      {
        queries: isbnNumbers,
        modifier: ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
        results: instanceTitles,
      },
      {
        queries: isbnNumbers,
        modifier: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
        results: instanceTitles,
      },
      {
        queries: isbnNumbers,
        modifier: ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
        results: instanceTitles,
      },
      {
        queries: isbnNumbers,
        modifier: ADVANCED_SEARCH_MODIFIERS.CONTAINS_ANY,
        results: instanceTitles,
      },
      {
        queries: [
          isbnNumbers[0].slice(0, -1),
          isbnNumbers[1].slice(0, -1),
          isbnNumbers[2].slice(0, -1),
        ],
        modifier: ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
        results: instanceTitles,
      },
      {
        queries: [
          isbnNumbers[0].slice(0, -1),
          isbnNumbers[1].slice(0, -1),
          isbnNumbers[2].slice(0, -1),
        ],
        modifier: ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
        results: [],
      },
    ];
    const userCapabilitySets = [CapabilitySets.uiInventoryInstanceView];

    const createdRecordIds = [];
    let identifierTypeId;

    before('Creating data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          InventoryInstances.getIdentifierTypes({
            query: `name=="${testData.identifierTypeName}"`,
          }).then((identifier) => {
            identifierTypeId = identifier.id;
          });
        })
        .then(() => {
          isbnNumbers.forEach((isbn, index) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: instanceTitles[index],
                identifiers: [
                  {
                    value: isbn,
                    identifierTypeId,
                  },
                ],
              },
            }).then((createdInstanceData) => {
              createdRecordIds.push(createdInstanceData.instanceId);
            });
          });
        })
        .then(() => {
          cy.createTempUser([]).then((userProperties) => {
            testData.user = userProperties;
            cy.assignCapabilitiesToExistingUser(testData.user.userId, [], userCapabilitySets);

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Deleting data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        createdRecordIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });
    });

    it(
      'C1030060 Advanced search | Verify ISSN search (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C1030060'] },
      () => {
        searchData.forEach(({ queries, modifier, results }) => {
          InventoryInstances.clickAdvSearchButton();
          queries.forEach((query, queryIndex) => {
            InventoryInstances.fillAdvSearchRow(
              queryIndex,
              query,
              modifier,
              testData.isbnSearchOption,
              queryIndex === 0 ? undefined : 'OR',
            );
            InventoryInstances.checkAdvSearchModalValues(
              queryIndex,
              query,
              modifier,
              testData.isbnSearchOption,
              queryIndex === 0 ? undefined : 'OR',
            );
          });
          cy.intercept('GET', 'search/instances?*').as('getInstances');
          InventoryInstances.clickSearchBtnInAdvSearchModal();
          cy.wait('@getInstances').its('response.statusCode').should('eq', 200);
          cy.wait(1000); // wait for search results to be updated
          InventoryInstances.checkAdvSearchModalAbsence();
          results.forEach((title) => {
            InventorySearchAndFilter.verifySearchResult(title);
          });
          if (!results.length) {
            instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title, false);
            });
          }
        });
      },
    );
  });
});
