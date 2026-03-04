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
    const randomDigits = `368023${randomNDigitNumber(8)}`;
    const testData = {
      instanceTitlePrefix: `AT_C368023_FolioInstance_${randomPostfix}`,
      user: {},
      identifierTypeName: 'Publisher or distributor number',
      keywordSearchOption: searchInstancesOptions[0],
      identifierParts: {
        letters1: `Rózs${getRandomLetters(7)}`,
        letters2: `Co${getRandomLetters(4)}.`,
        letters3: `Fol${getRandomLetters(5)} mus${getRandomLetters(5)}`,
        digits: randomDigits,
      },
    };
    const identifierValues = [
      `${testData.identifierParts.letters1} & ${testData.identifierParts.letters2} ${testData.identifierParts.digits}`,
      `${testData.identifierParts.letters1} and ${testData.identifierParts.letters2} ${testData.identifierParts.digits}`,
      `${testData.identifierParts.letters1} ${testData.identifierParts.letters2} ${testData.identifierParts.digits} : ${testData.identifierParts.letters3}`,
    ];
    const instanceTitles = Array.from(
      { length: identifierValues.length },
      (_, i) => `${testData.instanceTitlePrefix}_${i}`,
    );
    const searchData = [
      {
        query: `${testData.identifierParts.letters1} & ${testData.identifierParts.letters2} ${testData.identifierParts.digits}`,
        expectedInstanceIndexes: [0],
      },
      {
        query: `${testData.identifierParts.letters1} and ${testData.identifierParts.letters2} ${testData.identifierParts.digits}`,
        expectedInstanceIndexes: [1],
      },
      {
        query: `${testData.identifierParts.letters1} ${testData.identifierParts.letters2} ${testData.identifierParts.digits}`,
        expectedInstanceIndexes: [0, 1, 2],
      },
      {
        query: `${testData.identifierParts.letters1} ${testData.identifierParts.letters2} ${testData.identifierParts.letters3}`,
        expectedInstanceIndexes: [2],
      },
      {
        query: `${testData.identifierParts.letters2} ${testData.identifierParts.letters1}`,
        expectedInstanceIndexes: [0, 1, 2],
      },
      {
        query: `${testData.identifierParts.letters2} & ${testData.identifierParts.letters1}`,
        expectedInstanceIndexes: [0],
      },
      {
        query: `${testData.identifierParts.letters2} and ${testData.identifierParts.letters1}`,
        expectedInstanceIndexes: [1],
      },
      {
        query: `& ${testData.identifierParts.letters1} ${testData.identifierParts.letters2} ${testData.identifierParts.digits}`,
        expectedInstanceIndexes: [0],
      },
      {
        query: `${testData.identifierParts.letters1} ${testData.identifierParts.letters2} ${testData.identifierParts.digits}&`,
        expectedInstanceIndexes: [],
      },
      {
        query: `${testData.identifierParts.letters1}&${testData.identifierParts.letters2} ${testData.identifierParts.digits}`,
        expectedInstanceIndexes: [],
      },
    ];
    const instanceIds = [];
    let instanceTypeId;
    let identifierTypeId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C368023');
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
      'C368023 Search for "Instance" by "Resource identifier" field having "&" character" using "Keyword" search option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C368023'] },
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
