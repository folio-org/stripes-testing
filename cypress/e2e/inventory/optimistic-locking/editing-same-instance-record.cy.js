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
      instanceTitle: `AT_C350657_FolioInstance_${randomPostfix}`,
      instanceTitleUpdatedByA: `AT_C350657_FolioInstance_${randomPostfix} Updated by A`,
      instanceTitleUpdatedByB: `AT_C350657_FolioInstance_${randomPostfix} Updated by B`,
    };
    let instanceId;
    let userA;
    let userB;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C350657_');

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
      'C350657 Editing same instance record (promin)',
      { tags: ['criticalPath', 'promin', 'C350657'] },
      () => {
        // Steps 1-2: User A opens the instance in edit mode
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

        // User A fills in an updated title (but has NOT saved yet)
        InstanceRecordEdit.fillResourceTitle(testData.instanceTitleUpdatedByA);
        InstanceRecordEdit.checkButtonsEnabled({ saveAndClose: true, saveKeepEditing: true });

        // Step 3: While User A has the record open in edit mode, User B (the "other tab")
        // updates and saves the same record via API — incrementing its _version
        cy.getToken(userB.username, userB.password).then(() => {
          cy.getInstanceById(instanceId).then((instanceData) => {
            cy.updateInstance({ ...instanceData, title: testData.instanceTitleUpdatedByB }).then(
              () => {
                // Switch back to User A's token so subsequent UI actions run as User A
                cy.getToken(userA.username, userA.password);

                // Step 4: User A clicks Save — record is now stale → optimistic locking 409 error
                InstanceRecordEdit.clickSaveAndCloseButton();

                // Step 4: Verify the optimistic locking banner is shown
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
