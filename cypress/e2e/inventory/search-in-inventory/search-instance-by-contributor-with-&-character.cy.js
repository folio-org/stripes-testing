import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = `C368025${randomFourDigitNumber()}`;
    const instanceTitlePrefix = `AT_C368025_FolioInstance_${randomPostfix}`;
    const keywordOption = searchInstancesOptions[0];

    const contributorNames = [
      `${randomDigits} Leeds & Northrup Company`,
      `${randomDigits} Leeds and Northrup Company`,
      `${randomDigits} Leeds Northrup Company of National Defense`,
    ];

    const searchTerms = [
      {
        value: `${randomDigits} Leeds & Northrup Company`,
        expectedInstanceIndexes: [1, 2],
      },
      {
        value: `${randomDigits} Leeds and Northrup Company`,
        expectedInstanceIndexes: [1, 2],
      },
      {
        value: `${randomDigits} Leeds Northrup Company`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `${randomDigits} Leeds Company of National Defense`,
        expectedInstanceIndexes: [3],
      },
      {
        value: `${randomDigits} Company Leeds`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `${randomDigits} Company & Leeds`,
        expectedInstanceIndexes: [1, 2],
      },
      {
        value: `${randomDigits} Company and Leeds`,
        expectedInstanceIndexes: [1, 2],
      },
      {
        value: `${randomDigits} & Leeds Northrup Company`,
        expectedInstanceIndexes: [1, 2],
      },
      {
        value: `${randomDigits} Leeds Northrup Company&`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `${randomDigits} Leed&Northrup Company`,
        expectedInstanceIndexes: [],
      },
    ];

    const instances = contributorNames.map((name, index) => ({
      title: `${instanceTitlePrefix}_${index + 1}`,
      contributorName: name,
    }));

    let instanceTypeId;
    let contributorNameTypeId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C368025_FolioInstance');

      cy.then(() => {
        // Get required instance metadata
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        BrowseContributors.getContributorNameTypes({ searchParams: { limit: 1 } }).then(
          (nameTypes) => {
            contributorNameTypeId = nameTypes[0].id;
          },
        );
      }).then(() => {
        // Create all instances
        instances.forEach((instance) => {
          cy.createInstance({
            instance: {
              instanceTypeId,
              title: instance.title,
              contributors: [
                {
                  name: instance.contributorName,
                  contributorNameTypeId,
                  primary: false,
                },
              ],
              languages: ['eng'],
            },
          }).then((instanceId) => {
            instance.id = instanceId;
          });
        });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventorySearchAndFilter.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      instances.forEach((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    });

    it(
      'C368025 Search for an Instance by the Contributor name field containing the “&” character using the Keyword search option',
      { tags: ['extendedPath', 'spitfire', 'C368025'] },
      () => {
        // Ensure we're on the Instance tab with Keyword search selected
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(keywordOption);

        searchTerms.forEach((term) => {
          if (term.expectedInstanceIndexes.length) {
            InventoryInstances.searchByTitle(term.value);
            InventorySearchAndFilter.checkRowsCount(term.expectedInstanceIndexes.length);
            term.expectedInstanceIndexes.forEach((index) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(`${instanceTitlePrefix}_${index}`);
            });
          } else {
            InventoryInstances.searchByTitle(term.value, false);
            InventorySearchAndFilter.verifyResultPaneEmpty();
          }
          InventorySearchAndFilter.clearSearchInputField();
          InventorySearchAndFilter.verifyResultPaneEmpty();
        });
      },
    );
  });
});
