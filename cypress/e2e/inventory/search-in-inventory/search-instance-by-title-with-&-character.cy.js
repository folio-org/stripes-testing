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
    const randomDigits = `C368006${randomFourDigitNumber()}`;
    const keywordOption = searchInstancesOptions[0];

    const titles = [
      `AT_C368006_FolioInstance_${randomDigits} Algorithmic Topology & Classification of 3-Manifolds [electronic resource] / edited by Sergei Matveev.`,
      `AT_C368006_FolioInstance_${randomDigits} Algorithmic Topology and Classification of 3-Manifolds [electronic resource] / edited by Sergei Matveev.`,
      `AT_C368006_FolioInstance_${randomDigits} Algorithmic Topology Classification of 3-Manifolds [electronic resource] / edited by Sergei Matveev (Mathematician).`,
    ];

    const searchTerms = [
      {
        value: `AT_C368006_FolioInstance_${randomDigits} Algorithmic Topology & Classification of 3-Manifolds [electronic resource] / edited by Sergei Matveev.`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `AT_C368006_FolioInstance_${randomDigits} Algorithmic Topology and Classification of 3-Manifolds [electronic resource] / edited by Sergei Matveev.`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `AT_C368006_FolioInstance_${randomDigits} Algorithmic Topology Classification of 3-Manifolds [electronic resource] / edited by Sergei Matveev.`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `AT_C368006_FolioInstance_${randomDigits} Algorithmic Topology Classification by Sergei Matveev (Mathematician).`,
        expectedInstanceIndexes: [3],
      },
      {
        value: `AT_C368006_FolioInstance_${randomDigits} edited by Sergei Matveev. Algorithmic Topology Classification`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `AT_C368006_FolioInstance_${randomDigits} edited by Sergei Matveev & Algorithmic Topology Classification`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `AT_C368006_FolioInstance_${randomDigits} edited by Sergei Matveev and Algorithmic Topology Classification`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `AT_C368006_FolioInstance_${randomDigits} & Algorithmic Topology Classification of 3-Manifolds [electronic resource] / edited by Sergei Matveev.`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `AT_C368006_FolioInstance_${randomDigits} Algorithmic Topology Classification of 3-Manifolds [electronic resource] / edited by Sergei Matveev&.`,
        expectedInstanceIndexes: [1, 2, 3],
      },
      {
        value: `AT_C368006_FolioInstance_${randomDigits} Algorithmic Topology&Classification of 3-Manifolds [electronic resource] / edited by Sergei Matveev.`,
        expectedInstanceIndexes: [1, 2, 3],
      },
    ];

    const instances = titles.map((title) => ({
      title,
    }));

    let instanceTypeId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C368006_FolioInstance');

      cy.then(() => {
        // Get required instance metadata
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
      }).then(() => {
        // Create all instances
        instances.forEach((instance) => {
          cy.createInstance({
            instance: {
              instanceTypeId,
              title: instance.title,
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
      'C368006 Search for an Instance by Title containing the “&” character using the Keyword search option',
      { tags: ['extendedPath', 'spitfire', 'C368006'] },
      () => {
        // Ensure we're on the Instance tab with Keyword search selected
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(keywordOption);

        searchTerms.forEach((term) => {
          if (term.expectedInstanceIndexes.length) {
            InventoryInstances.searchByTitle(term.value);
            InventorySearchAndFilter.checkRowsCount(term.expectedInstanceIndexes.length);
            term.expectedInstanceIndexes.forEach((index) => {
              InventorySearchAndFilter.verifyInstanceDisplayed(instances[index - 1].title);
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
