import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomFourDigitNumber();
    const datePrefix = `584425${randomDigits}${randomDigits}`;
    const testData = {
      instanceTitlePrefix: `AT_C584425_FolioInstance_${randomPostfix}`,
      user: {},
      searchOption: searchInstancesOptions.at(-3), // All
    };
    const instanceTitles = Array.from(
      { length: 11 },
      (_, i) => `${testData.instanceTitlePrefix}_${i}`,
    );
    const publicationDates = [
      `${datePrefix}1763${datePrefix}`,
      `${datePrefix}0003${datePrefix}`,
      `${datePrefix}176u${datePrefix}`,
      `${datePrefix}176b${datePrefix}`,
      `${datePrefix}dd63${datePrefix}`,
      `${datePrefix}17\\\\\\${datePrefix}`,
      `${datePrefix}\\\\763${datePrefix}`,
      `${datePrefix}u763${datePrefix}`,
      `${datePrefix}1\\\\63${datePrefix}`,
      `${datePrefix}1u63${datePrefix}`,
      `${datePrefix}176\\${datePrefix}`,
    ];
    const searchData = [
      { query: `${datePrefix}1763${datePrefix}`, instanceIndexes: [0] },
      { query: `${datePrefix}0003${datePrefix}`, instanceIndexes: [1] },
      { query: `${datePrefix}176u${datePrefix}`, instanceIndexes: [2] },
      { query: `${datePrefix}176b${datePrefix}`, instanceIndexes: [3] },
      { query: `${datePrefix}dd63${datePrefix}`, instanceIndexes: [4] },
      { query: `${datePrefix}17\\\\\\${datePrefix}`, instanceIndexes: [5] },
      { query: `${datePrefix}\\\\763${datePrefix}`, instanceIndexes: [6] },
      { query: `*763${datePrefix}`, instanceIndexes: [0, 6, 7] },
      { query: `${datePrefix}1*63${datePrefix}`, instanceIndexes: [0, 8, 9] },
      { query: `${datePrefix}176*`, instanceIndexes: [0, 2, 3, 10] },
    ];
    const instanceIds = [];
    let instanceTypeId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C584425_FolioInstance');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
      })
        .then(() => {
          publicationDates.forEach((date, index) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: instanceTitles[index],
                publication: [
                  {
                    publisher: '',
                    place: '',
                    dateOfPublication: date,
                    role: '',
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
      'C584425 Search for Instances by "Publication date" field using "All" search option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C584425'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });

        searchData.forEach((search, index) => {
          if (index) InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();

          InventorySearchAndFilter.searchByParameter(testData.searchOption, search.query);
          search.instanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
        });
      },
    );
  });
});
