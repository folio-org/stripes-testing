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
    const randomDigits = `${randomFourDigitNumber()}${randomFourDigitNumber()}`;
    const testData = {
      instanceTitlePrefix: `AT_C3611_FolioInstance_${randomPostfix}`,
      user: {},
      searchOption: searchInstancesOptions[6], // ISSN
      issnNumbers: [`3611-${randomDigits}-1`, `3611-${randomDigits}-2`, `3611-${randomDigits}-3`],
    };
    const instanceIds = [];
    let instanceTypeId;
    let issnTypeId;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C3611_FolioInstance');
      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        InventoryInstances.getIdentifierTypes({ query: 'name="ISSN"' }).then((identifier) => {
          issnTypeId = identifier.id;
        });
      }).then(() => {
        // Create 3 instances with different ISSN values
        testData.issnNumbers.forEach((issnNumber, index) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: `${testData.instanceTitlePrefix}_${index + 1}`,
              identifiers: [
                {
                  value: issnNumber,
                  identifierTypeId: issnTypeId,
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
      'C3611 Search: Verify search on ISSN (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C3611'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
        }, 20_000);
        InventoryInstances.waitContentLoading();

        // Step 1: Open the Inventory app. Select the Instance segment.
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.verifyResultPaneEmpty();

        // Step 2: Select ISSN search option from the drop down list.
        InventorySearchAndFilter.selectSearchOption(testData.searchOption);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);

        // Step 3: Enter an ISSN that you know is already in the inventory
        InventoryInstances.searchByTitle(testData.issnNumbers[0]);
        InventorySearchAndFilter.verifySearchResult(`${testData.instanceTitlePrefix}_1`);
        InventorySearchAndFilter.checkRowsCount(1);

        // Step 4: You can repeat the test with 1 or 2 other ISSN searches
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.searchByParameter(testData.searchOption, testData.issnNumbers[1]);
        InventorySearchAndFilter.verifySearchResult(`${testData.instanceTitlePrefix}_2`);
        InventorySearchAndFilter.checkRowsCount(1);

        // Repeat with third ISSN
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.searchByParameter(testData.searchOption, testData.issnNumbers[2]);
        InventorySearchAndFilter.verifySearchResult(`${testData.instanceTitlePrefix}_3`);
        InventorySearchAndFilter.checkRowsCount(1);
      },
    );
  });
});
