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
    const frequencyPrefix = `584426${randomDigits}${randomDigits}`;
    const testData = {
      instanceTitlePrefix: `AT_C584426_FolioInstance_${randomPostfix}`,
      user: {},
      searchOption: searchInstancesOptions.at(-3), // All
    };
    const publicationFrequencies = [
      `${frequencyPrefix}1985${frequencyPrefix}`,
      `${frequencyPrefix}1985${frequencyPrefix}`,
      `${frequencyPrefix}198\\${frequencyPrefix}`,
      `${frequencyPrefix}\\\\985${frequencyPrefix}`,
      `${frequencyPrefix}\\\\985${frequencyPrefix}`,
      `${frequencyPrefix}1\\\\85${frequencyPrefix}`,
    ];
    const instanceTitles = Array.from(
      { length: publicationFrequencies.length },
      (_, i) => `${testData.instanceTitlePrefix}_${i}`,
    );
    const searchData = [
      { query: `${frequencyPrefix}1985${frequencyPrefix}`, instanceIndexes: [0, 1] },
      { query: `${frequencyPrefix}198\\${frequencyPrefix}`, instanceIndexes: [2] },
      { query: `${frequencyPrefix}\\\\985${frequencyPrefix}`, instanceIndexes: [3, 4] },
      { query: `${frequencyPrefix}1\\\\85${frequencyPrefix}`, instanceIndexes: [5] },
    ];
    const instanceIds = [];
    let instanceTypeId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C584426_FolioInstance');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
      })
        .then(() => {
          publicationFrequencies.forEach((frequency, index) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: instanceTitles[index],
                publicationFrequency: [frequency],
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
      'C584426 Search for Instances by "Publication frequency" field using "All" search option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C584426'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
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
