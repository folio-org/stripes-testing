import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = `368042-${randomNDigitNumber(8)}`;
    const testData = {
      instanceTitlePrefix: `AT_C368042_FolioInstance_${randomPostfix}`,
      user: {},
      identifierTypeName: 'ISSN',
      keywordSearchOption: searchInstancesOptions[0],
      identifierParts: {
        letters1: `Info${getRandomLetters(7)}`,
        letters2: `no${getRandomLetters(4)}.`,
        letters3: `res${getRandomLetters(7)}`,
        digits: randomDigits,
      },
    };
    const identifierValues = [
      `${testData.identifierParts.digits} ${testData.identifierParts.letters1} and ${testData.identifierParts.letters2}`,
      `${testData.identifierParts.digits} ${testData.identifierParts.letters1} & ${testData.identifierParts.letters2}`,
      `${testData.identifierParts.digits} ${testData.identifierParts.letters1} : ${testData.identifierParts.letters2}`,
      `${testData.identifierParts.digits} ${testData.identifierParts.letters1} / ${testData.identifierParts.letters2}`,
      `${testData.identifierParts.digits} ${testData.identifierParts.letters1} - ${testData.identifierParts.letters2}`,
      `${testData.identifierParts.digits} & ${testData.identifierParts.letters1} : ${testData.identifierParts.letters2} / ${testData.identifierParts.letters3}`,
      `${testData.identifierParts.digits} ${testData.identifierParts.letters1} ${testData.identifierParts.letters2}`,
      `${testData.identifierParts.digits}/ ${testData.identifierParts.letters1}&${testData.identifierParts.letters2}:`,
    ];
    const instanceTitles = Array.from(
      { length: identifierValues.length },
      (_, i) => `${testData.instanceTitlePrefix}_${i}`,
    );
    const searchData = [
      {
        query: `${testData.identifierParts.digits} ${testData.identifierParts.letters1} ${testData.identifierParts.letters2}`,
        expectedInstanceIndexes: [0, 1, 2, 3, 4, 5, 6],
      },
      {
        query: `${testData.identifierParts.digits} ${testData.identifierParts.letters1} & ${testData.identifierParts.letters2}`,
        expectedInstanceIndexes: [1, 5],
      },
      {
        query: `${testData.identifierParts.digits} ${testData.identifierParts.letters1} : ${testData.identifierParts.letters2}`,
        expectedInstanceIndexes: [2, 5],
      },
      {
        query: `${testData.identifierParts.digits} ${testData.identifierParts.letters1} / ${testData.identifierParts.letters2}`,
        expectedInstanceIndexes: [3, 5],
      },
      {
        query: `${testData.identifierParts.digits}/ ${testData.identifierParts.letters1}&${testData.identifierParts.letters2}:`,
        expectedInstanceIndexes: [7],
      },
      {
        query: `${testData.identifierParts.letters1} : ${testData.identifierParts.letters2} ${testData.identifierParts.digits}`,
        expectedInstanceIndexes: [2, 5],
      },
      {
        query: `${testData.identifierParts.digits} ${testData.identifierParts.letters1} and ${testData.identifierParts.letters2}`,
        expectedInstanceIndexes: [0],
      },
      {
        query: `${testData.identifierParts.digits} & ${testData.identifierParts.letters1} : ${testData.identifierParts.letters2} / ${testData.identifierParts.letters3}`,
        expectedInstanceIndexes: [5],
      },
      {
        query: `${testData.identifierParts.digits} ${testData.identifierParts.letters1} - ${testData.identifierParts.letters2}`,
        expectedInstanceIndexes: [4, 6],
      },
    ];
    const instanceIds = [];
    let instanceTypeId;
    let identifierTypeId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C368042');
      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        InventoryInstances.getIdentifierTypes({
          query: `name=="${testData.identifierTypeName}"`,
        }).then((identifierType) => {
          identifierTypeId = identifierType.id;
        });
      })
        .then(() => {
          instanceTitles.forEach((title, index) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title,
                identifiers: [
                  {
                    value: identifierValues[index],
                    identifierTypeId,
                  },
                ],
              },
            }).then((instanceData) => {
              instanceIds.push(instanceData.instanceId);
            });
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventorySearchAndFilter.instanceTabIsDefault();
            InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
              testData.keywordSearchOption,
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
      'C368042 Search for "Instance" by "Resource identifier" field with special characters using "Keyword" search option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C368042'] },
      () => {
        searchData.forEach(({ query, expectedInstanceIndexes }) => {
          InventorySearchAndFilter.fillInSearchQuery(query);
          InventorySearchAndFilter.checkSearchQueryText(query);
          InventorySearchAndFilter.checkSearchButtonEnabled();

          InventorySearchAndFilter.clickSearch();
          if (!expectedInstanceIndexes.length) {
            InventorySearchAndFilter.verifyResultPaneEmpty({
              noResultsFound: true,
              searchQuery: query,
            });
          }
          instanceTitles.forEach((title, index) => {
            const isExpected = expectedInstanceIndexes.includes(index);
            InventorySearchAndFilter.verifySearchResult(title, isExpected);
          });

          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.verifySearchButtonDisabled();
        });
      },
    );
  });
});
