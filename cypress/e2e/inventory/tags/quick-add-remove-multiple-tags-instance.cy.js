import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe.skip('Inventory', () => {
  describe('Tags', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C490906_FolioInstance_${randomPostfix}`,
      tags: [],
    };
    let user;
    let instanceId;

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          // Create test tags
          for (let i = 1; i <= 5; i++) {
            const tagLabel = `at_c490906_tag${i}_${randomPostfix}`;
            cy.createTagApi({
              label: tagLabel,
              description: `Test tag ${i} for C490906`,
            }).then((tagId) => {
              testData.tags.push({
                id: tagId,
                label: tagLabel,
              });
            });
          }

          cy.getInstanceTypes({ limit: 1 });
          cy.getInstanceIdentifierTypes({ limit: 1 });
        })
        .then(() => {
          // Create instance with source "Folio"
          cy.createInstance({
            instance: {
              instanceTypeId: Cypress.env('instanceTypes')[0].id,
              title: testData.instanceTitle,
              source: INSTANCE_SOURCE_NAMES.FOLIO,
            },
          }).then((specialInstanceId) => {
            instanceId = specialInstanceId;
          });
        });

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiTagsPermissionAll.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        testData.tags.forEach((tag) => {
          cy.deleteTagApi(tag.id);
        });
        InventoryInstance.deleteInstanceViaApi(instanceId);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C490906 Verify that user can quickly add more than 1 tag to "Instance" record with source "Folio" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C490906'] },
      () => {
        // Search for and open the instance
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventorySearchAndFilter.openTagsField();

        InventoryInstance.addMultipleTags(testData.tags.map((tag) => tag.label));

        // Verify no error messages appeared
        InteractorsTools.checkNoErrorCallouts();

        // Step 4: Close the "Tags" pane
        InventorySearchAndFilter.closeTagsPane();

        // Expected: The amount of assigned tags is displayed next to "Tags" icon
        InventorySearchAndFilter.checkTagsCounter(testData.tags.length);

        // Step 5: Click on the "Tags" icon on the top-right side of Instance pane
        InventorySearchAndFilter.openTagsField();

        // Expected: "Tags" right pane has multiselect dropdown, dropdown contains all tags assigned in step #3
        InventorySearchAndFilter.verifyTagsView();
        testData.tags.forEach((tag) => {
          InventoryInstance.checkTagSelectedInDropdown(tag.label);
        });

        // Step 6: Quickly delete 2-3 tags by clicking on the "x" icon next to each tag
        InventoryInstance.deleteMultipleTags(testData.tags.slice(0, 3).map((tag) => tag.label));

        // Verify no error messages appeared
        InteractorsTools.checkNoErrorCallouts();

        // Step 8: Quickly unselect the remaining tags by clicking on the tag row in multiselect dropdown
        InventoryInstance.deleteMultipleTags(testData.tags.slice(3).map((tag) => tag.label));

        // Verify no error messages appeared
        InteractorsTools.checkNoErrorCallouts();

        // Verify no tags are assigned
        InventorySearchAndFilter.closeTagsPane();
        InventorySearchAndFilter.checkTagsCounter(0);
      },
    );
  });
});
