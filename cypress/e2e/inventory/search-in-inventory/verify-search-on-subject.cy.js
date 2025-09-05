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
      instanceTitlePrefix: `AT_C2323_FolioInstance_${randomPostfix}`,
      user: {},
      searchOption: searchInstancesOptions[12], // Subject
      subjects: [
        `wolves ${randomPostfix}`,
        `environmental ${randomPostfix}`,
        `renaissance ${randomPostfix}`,
      ],
    };
    const instanceIds = [];

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C2323_FolioInstance');
      cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
        // Create 3 instances with different subjects
        testData.subjects.forEach((subject, index) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: `${testData.instanceTitlePrefix}_${index + 1}`,
              subjects: [
                {
                  value: subject,
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
      'C2323 Search: Verify search on Subject (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C2323'] },
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

        // Step 2: Select Subject search option from the list.
        InventorySearchAndFilter.selectSearchOption(testData.searchOption);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);

        // Step 3: Enter a given subject heading
        InventoryInstances.searchByTitle(testData.subjects[0]);
        InventorySearchAndFilter.verifySearchResult(`${testData.instanceTitlePrefix}_1`);
        InventorySearchAndFilter.checkRowsCount(1);

        // Step 4: Use Reset all button to clear searches and repeat with second subject
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.searchByParameter(testData.searchOption, testData.subjects[1]);
        InventorySearchAndFilter.verifySearchResult(`${testData.instanceTitlePrefix}_2`);
        InventorySearchAndFilter.checkRowsCount(1);

        // Repeat with third subject heading
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.searchByParameter(testData.searchOption, testData.subjects[2]);
        InventorySearchAndFilter.verifySearchResult(`${testData.instanceTitlePrefix}_3`);
        InventorySearchAndFilter.checkRowsCount(1);
      },
    );
  });
});
