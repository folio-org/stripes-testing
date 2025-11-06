import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe.skip('Inventory', () => {
  describe(
    'Tags',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let userId;
      let instanceRecord = null;
      let testTag;
      const tagsCount = '1';

      beforeEach(() => {
        testTag = `test_tag_${uuid()}`;
        cy.getAdminToken()
          .then(() => {
            InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
              instanceRecord = instanceData;
            });
          })
          .then(() => {
            cy.createTempUser([
              permissions.inventoryAll.gui,
              permissions.uiTagsPermissionAll.gui,
            ]).then(({ username, password, userId: id }) => {
              userId = id;
              cy.login(username, password, {
                path: TopMenu.inventoryPath,
                waiter: InventorySearchAndFilter.waitLoading,
              });
            });
          });
      });

      afterEach(() => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(instanceRecord.instanceId);
        Users.deleteViaApi(userId);
      });

      it(
        'C343215 Filter instances by tags (volaris)',
        { tags: ['smoke', 'volaris', 'shiftLeft', 'C343215', 'eurekaPhase1'] },
        () => {
          InventorySearchAndFilter.verifyPanesExist();
          InventorySearchAndFilter.searchInstanceByTitle(instanceRecord.instanceTitle);
          InventorySearchAndFilter.verifySearchResult(instanceRecord.instanceTitle);
          InventorySearchAndFilter.selectFoundInstance(instanceRecord.instanceTitle);
          InventorySearchAndFilter.verifyInstanceDetailsView();
          InventorySearchAndFilter.openTagsField();
          InventorySearchAndFilter.verifyTagsView();
          InventorySearchAndFilter.addTag(testTag);
          cy.reload();
          cy.wait(5000);
          InventorySearchAndFilter.verifyTagCount(tagsCount);
          InventorySearchAndFilter.closeInstanceDetailPane();
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.filterByTag(testTag);
          InventorySearchAndFilter.verifyIsFilteredByTag(instanceRecord.instanceTitle);
        },
      );
    },
  );
});
