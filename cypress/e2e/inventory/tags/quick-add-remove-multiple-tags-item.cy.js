import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';

describe.skip('Inventory', () => {
  describe('Tags', () => {
    describe('Item tags', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        folioInstanceTitle: `AT_C490909_FolioInstance_${randomPostfix}`,
        itemBarcode: `AT_C490909_${randomPostfix}`,
        tags: [],
      };
      let user;

      before('Create test data', () => {
        cy.getAdminToken()
          .then(() => {
            // Create test tags
            for (let i = 1; i <= 5; i++) {
              const tagLabel = `at_c490909_tag${i}_${randomPostfix}`;
              cy.createTagApi({
                label: tagLabel,
                description: `Test tag ${i} for C490909`,
              }).then((tagId) => {
                testData.tags.push({
                  id: tagId,
                  label: tagLabel,
                });
              });
            }
          })
          .then(() => {
            InventoryInstances.createInstanceViaApi(
              testData.folioInstanceTitle,
              testData.itemBarcode,
            );

            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiTagsPermissionAll.gui,
            ]).then((userProperties) => {
              user = userProperties;

              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          testData.tags.forEach((tag) => {
            cy.deleteTagApi(tag.id);
          });
          InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
          Users.deleteViaApi(user.userId);
        });
      });

      it(
        'C490909 Verify that user can quickly add more than 1 tag to Item record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C490909'] },
        () => {
          // 1. Go to "Inventory" app → Search by title for the Instance created as precondition
          InventorySearchAndFilter.searchInstanceByTitle(testData.folioInstanceTitle);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          // 2,3. Open Holdings and click on the item Barcode link to open Item details record
          InventoryInstance.openHoldingsAccordion('Holdings: ');
          InventoryInstance.openItemByBarcode(testData.itemBarcode);
          ItemRecordView.waitLoading();

          // Expand "Tags" accordion
          ItemRecordView.toggleTagsAccordion();

          // 5. Using dropdown list add 4-5 different tags to the Item record
          InventoryInstance.addMultipleTags(testData.tags.map((tag) => tag.label));

          // Verify no error messages appeared
          InteractorsTools.checkNoErrorCallouts();

          // 7. Close the "Tags" accordion
          ItemRecordView.toggleTagsAccordion(false);

          // Expected: The amount of assigned tags is displayed next to "Tags" counter
          ItemRecordView.checkTagsCounter(testData.tags.length);

          // Expand "Tags" accordion and verify tags are still present
          ItemRecordView.toggleTagsAccordion();

          // Expected: Dropdown contains all tags assigned previously
          testData.tags.forEach((tag) => {
            InventoryInstance.checkTagSelectedInDropdown(tag.label);
          });

          // 9. Quickly delete 2-3 tags by clicking on the "x" icon next to each tag
          InventoryInstance.deleteMultipleTags(testData.tags.slice(0, 3).map((tag) => tag.label));

          // Verify no error messages appeared
          InteractorsTools.checkNoErrorCallouts();

          // 10. Quickly unselect the remaining tags by clicking on the tag row in multiselect dropdown
          InventoryInstance.deleteMultipleTags(testData.tags.slice(3).map((tag) => tag.label));

          // Verify no error messages appeared
          InteractorsTools.checkNoErrorCallouts();

          // Verify no tags are assigned
          ItemRecordView.toggleTagsAccordion(false);
          ItemRecordView.checkTagsCounter(0);
        },
      );
    });
  });
});
