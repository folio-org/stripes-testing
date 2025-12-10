import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = `C368039${randomFourDigitNumber()}${randomFourDigitNumber()}`;
    const alternativeTitle =
      'MSEARCH-466 Search by "Index title" field which has special characters.';
    const instanceTitlePrefix = `AT_C368039_FolioInstance_${randomPostfix}`;
    const keywordOption = searchInstancesOptions[0];

    const indexTitles = [
      `${randomDigits}The fellowship of the ring and being the first part of The Lord of the Rings by J.R.R. ${randomDigits}Tolkien`,
      `${randomDigits}The fellowship of the ring & being the first part of The Lord of the Rings; by J.R.R. ${randomDigits}Tolkien`,
      `${randomDigits}The fellowship of the ring : being the first part of The Lord of the Rings by J.R.R. ${randomDigits}Tolkien.`,
      `"${randomDigits}The fellowship of the ring" / being the first part {of The Lord of the Rings} by J.R.R. ${randomDigits}Tolkien`,
      `.${randomDigits}The fellowship of the ring - being the first part of [The Lord of the Rings] by J.R.R. ${randomDigits}Tolkien !`,
      `${randomDigits}The fellowship of the ring & being the first part of :The Lord of the Rings / by writer (J.R.R.) ${randomDigits}Tolkien.`,
      `${randomDigits}The fellowship of the ring being the first part of The Lord of the Rings by J.R.R. ${randomDigits}Tolkien.`,
      `${randomDigits}The fellowship&of the ring: being the first part/ of The Lord of the Rings by J.R.R. ${randomDigits}Tolkien.`,
    ];

    const searchTerms = [
      {
        value: `${randomDigits}The fellowship of the ring being the first part of The Lord of the Rings by J.R.R. ${randomDigits}Tolkien`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        value: `${randomDigits}The fellowship of the ring & being the first part of The Lord of the Rings; by J.R.R. ${randomDigits}Tolkien`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        value: `${randomDigits}The fellowship of the ring : being the first part of The Lord of the Rings by J.R.R. ${randomDigits}Tolkien.`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        value: `"${randomDigits}The fellowship of the ring" / being the first part {of The Lord of the Rings} by J.R.R. ${randomDigits}Tolkien`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        value: `${randomDigits}The fellowship&of the ring: being the first part/ of The Lord of the Rings by J.R.R. ${randomDigits}Tolkien.`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        value: `J.R.R. ${randomDigits}Tolkien-The Lord of the Rings : ${randomDigits}The fellowship of the ring.`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        value: `${randomDigits}The fellowship of the ring and being the first part of The Lord of the Rings by J.R.R. ${randomDigits}Tolkien`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        value: `${randomDigits}The fellowship of the ring and being the first part of The Lord of the Rings by writer J.R.R. ${randomDigits}Tolkien`,
        expectedInstanceIndexes: [6],
      },
      {
        value: `.${randomDigits}The fellowship of the ring - being the first part of [The Lord of the Rings] by J.R.R. ${randomDigits}Tolkien !`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
    ];

    const instances = indexTitles.map((indexTitle, index) => ({
      title: `${instanceTitlePrefix}_${index + 1}`,
      indexTitle,
    }));

    let instanceTypeId;
    let alternativeTitleTypeId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C368039_FolioInstance');

      cy.then(() => {
        // Get required instance metadata
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        cy.getAlternativeTitlesTypes({ limit: 1, query: 'source=folio' }).then((altTitleTypes) => {
          alternativeTitleTypeId = altTitleTypes[0].id;
        });
      }).then(() => {
        // Create all instances with specific index titles and alternative titles
        instances.forEach((instance) => {
          cy.createInstance({
            instance: {
              instanceTypeId,
              title: instance.title,
              indexTitle: instance.indexTitle,
              alternativeTitles: [
                {
                  alternativeTitleTypeId,
                  alternativeTitle,
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
      'C368039 Search for "Instance" by "Index title" field with special characters using "Keyword" search option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C368039'] },
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
