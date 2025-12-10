import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomDigits = `C368041${randomFourDigitNumber()}${randomFourDigitNumber()}`;
    const keywordOption = searchInstancesOptions[0];
    const instanceTitlePrefix = `AT_C368041_FolioInstance_${randomDigits}`;

    const seriesStatements = [
      `${randomDigits}Ultimate Matrix and collection discs 5, ${randomDigits}6`,
      `${randomDigits}Ultimate & Matrix collection; discs 5-${randomDigits}6`,
      `${randomDigits}Ultimate Matrix : collection discs 5, ${randomDigits}6`,
      `"${randomDigits}Ultimate Matrix" / collection ; {discs 5, ${randomDigits}6}`,
      `.${randomDigits}Ultimate - Matrix [collection] discs 5, ${randomDigits}6 !`,
      `${randomDigits}Ultimate & Matrix : collection discs 5 / ${randomDigits}6, (new edition).`,
      `${randomDigits}Ultimate Matrix collection discs 5, ${randomDigits}6`,
      `${randomDigits}Ultimate&Matrix collection: discs 5/ ${randomDigits}6`,
    ];

    const searchTerms = [
      {
        value: `${randomDigits}Ultimate Matrix collection discs 5, ${randomDigits}6`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        value: `${randomDigits}Ultimate & Matrix collection; discs 5-${randomDigits}6`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        value: `${randomDigits}Ultimate Matrix : collection discs 5, ${randomDigits}6`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        value: `${randomDigits}Ultimate Matrix / collection discs 5-${randomDigits}6`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        value: `${randomDigits}Ultimate&Matrix collection: discs 5/ ${randomDigits}6`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        value: `discs 5-${randomDigits}6 : matrix ${randomDigits}ultimate-collection`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        value: `${randomDigits}Ultimate Matrix and collection discs 5, ${randomDigits}6`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        value: `${randomDigits}Ultimate & Matrix : collection discs 5 / ${randomDigits}6, (new edition).`,
        expectedInstanceIndexes: [6],
      },
      {
        value: `.${randomDigits}Ultimate - Matrix [collection] discs 5, ${randomDigits}6`,
        expectedInstanceIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
      },
    ];

    const instances = seriesStatements.map((seriesStatement, index) => ({
      title: `${instanceTitlePrefix}_${index + 1}`,
      seriesStatement,
    }));

    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C368041_FolioInstance');

      // Get required instance metadata
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
        // Create all instances with specific series statements
        instances.forEach((instance) => {
          cy.createInstance({
            instance: {
              instanceTypeId: instanceTypeData[0].id,
              title: instance.title,
              series: [{ value: instance.seriesStatement }],
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
      'C368041 Search for "Instance" by "Series statement" field with special characters using "Keyword" search option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C368041'] },
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
