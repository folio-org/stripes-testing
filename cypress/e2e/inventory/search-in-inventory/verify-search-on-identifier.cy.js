import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitlePrefix: `AT_C2320_FolioInstance_${randomPostfix}`,
      user: {},
      searchOption: searchInstancesOptions[3], // Identifier (all)
      identifiers: [
        { type: 'ISBN', value: `2320-ISBN-${randomPostfix}` },
        { type: 'ISSN', value: `2320-ISSN-${randomPostfix}` },
        { type: 'OCLC', value: `(OCoLC)2320${randomPostfix}` },
        { type: 'LCCN', value: `2320LCCN${randomPostfix}` },
      ],
    };
    const instanceIds = [];
    const identifierTypeIds = {};
    let instanceTypeId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C2320_FolioInstance');
      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        // Get identifier type IDs for each identifier type
        testData.identifiers.forEach((identifier) => {
          InventoryInstances.getIdentifierTypes({ query: `name="${identifier.type}"` }).then(
            (identifierType) => {
              identifierTypeIds[identifier.type] = identifierType.id;
            },
          );
        });
      }).then(() => {
        // Create 4 instances with different identifier types
        testData.identifiers.forEach((identifier, index) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: `${testData.instanceTitlePrefix}_${index}`,
              identifiers: [
                {
                  value: identifier.value,
                  identifierTypeId: identifierTypeIds[identifier.type],
                },
              ],
            },
          }).then((instanceData) => {
            instanceIds.push(instanceData.instanceId);
          });
        });

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
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
      'C2320 Search: Verify search on Identifier (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C2320'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
        }, 20_000);
        InventoryInstances.waitContentLoading();

        // Step 1: Open the Inventory app. Select the instance segment is selected.
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyResultPaneEmpty();

        // Step 2: Select Identifier (All) search option from the list.
        InventorySearchAndFilter.selectSearchOption(testData.searchOption);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);

        // Steps 3-6: Search for each identifier type in a cycle
        testData.identifiers.forEach((identifier, index) => {
          if (!index) InventoryInstances.searchByTitle(identifier.value);
          else {
            InventorySearchAndFilter.searchByParameter(testData.searchOption, identifier.value);
          }
          InventorySearchAndFilter.verifySearchResult(`${testData.instanceTitlePrefix}_${index}`);
          InventorySearchAndFilter.checkRowsCount(1);
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        });
      },
    );
  });
});
