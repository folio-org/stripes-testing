import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Result list', () => {
    describe('Consortia', () => {
      const testData = {
        instances: [],
      };
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C1322684_FolioInstance_${randomPostfix}`;
      const instanceTitles = Array.from({ length: 101 }, (_, i) => `${instanceTitlePrefix}_${i}`);

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C1322684_');

        // Create 101 instances with unique titles in Central tenant
        instanceTitles.forEach((title) => {
          InventoryInstance.createInstanceViaApi({ instanceTitle: title }).then(
            ({ instanceData }) => {
              testData.instances.push(instanceData);
            },
          );
        });

        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;

          // Assign capabilities in Central tenant
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventoryInstanceView],
          );

          // Assign capabilities in Member tenant (College)
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventoryInstanceView],
          );
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: false,
          }).then(() => {
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        testData.instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.instanceId);
        });
      });

      it(
        "C1322684 Verify that FOLIO UI doesn't freeze when the Instance Detail View pane is closed while it is still loading and then opened again (spitfire)",
        { tags: ['criticalPathECS', 'spitfire', 'C1322684'] },
        () => {
          function openAndReopenInstance(instanceTitle) {
            InventoryInstances.selectInstanceByTitle(instanceTitle);
            // Immediately close the detail view pane while it's still loading
            InventorySearchAndFilter.closeInstanceDetailPane();
            // Click on the first instance again
            InventoryInstances.selectInstanceByTitle(instanceTitle);
            // Verify the detail view pane is opened and contains expected title
            InventoryInstance.checkPresentedText(instanceTitle);
            InventorySearchAndFilter.closeInstanceDetailPane();
          }

          // Step 1: Perform a search that returns many results
          InventorySearchAndFilter.executeSearch(instanceTitlePrefix);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          InventorySearchAndFilter.verifyNumberOfSearchResults(100);
          InventorySearchAndFilter.checkListInventoryNextPaginationButtonEnabled();

          // Step 2: Click on the title of the first found Instance, close detail view pane while loading, and click again
          // Click on the first instance
          openAndReopenInstance(instanceTitles[0]);

          // Step 3: Repeat step 2 multiple times (not less than 10) with different records at result list
          for (let i = 1; i <= 10; i++) {
            openAndReopenInstance(instanceTitles[i]);
          }
        },
      );
    });
  });
});
