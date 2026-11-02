import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Optimistic locking', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C422030_FolioInstance_${randomPostfix}`,
      instanceTitleUpdatedByA: `AT_C422030_FolioInstance_${randomPostfix} Updated by A`,
      instanceTitleUpdatedByB: `AT_C422030_FolioInstance_${randomPostfix} Updated by B`,
    };
    let instanceId;
    let userA;
    let userB;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C422030_');

      InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
        ({ instanceData }) => {
          instanceId = instanceData.instanceId;
        },
      );

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        userA = userProperties;
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        userB = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(userA.userId);
        Users.deleteViaApi(userB.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C422030 Verify that optimistic locking message works for instances in non-consortial tenant (promin)',
      { tags: ['extendedPath', 'promin', 'C422030'] },
      () => {
        // Step 1-2: User A opens the instance and switches to edit mode (first window)
        cy.login(userA.username, userA.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        // Step 3: User A changes the title but does NOT save yet
        InstanceRecordEdit.fillResourceTitle(testData.instanceTitleUpdatedByA);
        InstanceRecordEdit.checkButtonsEnabled({ saveAndClose: true, saveKeepEditing: true });

        // Step 2 & 4: Cypress can't drive a real second browser window/tab, so User B's
        // "second window" edit + Save & Close is simulated via API instead
        cy.getToken(userB.username, userB.password).then(() => {
          cy.getInstanceById(instanceId).then((instanceData) => {
            cy.updateInstance({ ...instanceData, title: testData.instanceTitleUpdatedByB }).then(
              () => {
                // Switch back to User A's token so subsequent UI actions run as User A
                cy.getToken(userA.username, userA.password);

                // Step 5: User A clicks Save & Close in the first window - the record is now
                // stale, resulting in a 409 optimistic locking error
                InstanceRecordEdit.clickSaveAndCloseButton();

                // Step 5: "Saving instance failed" optimistic locking message is displayed
                InventorySteps.verifyOptimisticLockingBanner();

                // Navigate to the latest version via the banner link
                InventorySteps.clickViewLatestVersionLink();

                // Verify the instance shows User B's changes; User A's changes are NOT applied
                InventoryInstance.waitLoading();
                InventoryInstance.waitInstanceRecordViewOpened();
                InventoryInstance.checkInstanceTitle(testData.instanceTitleUpdatedByB);
                InventoryInstance.checkPresentedText(testData.instanceTitleUpdatedByA, false);
              },
            );
          });
        });
      },
    );
  });
});
