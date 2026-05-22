import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Optimistic locking', () => {
    const randomPostfix = getRandomPostfix();

    const testData = {
      instanceTitle: `AT_C399070_Instance_${randomPostfix}`,
      instanceTitleUpdatedByA: `AT_C399070_Instance_${randomPostfix} Updated by A`,
      instanceTitleUpdatedByB: `AT_C399070_Instance_${randomPostfix} Updated by B`,
    };

    let instanceId;
    let userA;
    let userB;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C399070_');

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
      cy.getAdminToken();
      Users.deleteViaApi(userA.userId);
      Users.deleteViaApi(userB.userId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    it(
      'C399070 Saving record using "Save & keep editing" button when "Instance" record is being edited by two users (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C399070'] },
      () => {
        // Steps 1-2: User A logs in, finds the instance and opens it for editing
        cy.login(userA.username, userA.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });

        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InstanceRecordView.waitLoading();
        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        // Step 1: User A updates the resource title
        InstanceRecordEdit.fillResourceTitle(testData.instanceTitleUpdatedByA);
        InstanceRecordEdit.checkButtonsEnabled({
          saveAndClose: true,
          saveKeepEditing: true,
          cancel: true,
        });

        // Steps 2-3: While User A has the record open, User B updates the same record via API
        // (Cypress does not support multiple browser tabs, so User B's actions are done via API)
        cy.getToken(userB.username, userB.password).then(() => {
          cy.getInstanceById(instanceId).then((instanceData) => {
            const updatedInstance = {
              ...instanceData,
              title: testData.instanceTitleUpdatedByB,
            };

            cy.updateInstance(updatedInstance).then(() => {
              // Switch back to User A's token so the UI session continues as User A
              cy.getToken(userA.username, userA.password);

              // Step 4: User A clicks "Save & keep editing" — triggers optimistic locking conflict
              // because User B has already saved a newer version of the record
              InstanceRecordEdit.clickSaveAndKeepEditingButton(false);

              // Step 4: Verify optimistic locking banner is shown
              InventorySteps.verifyOptimisticLockingBanner();

              // Step 5: Click "View latest version" link on the banner
              InventorySteps.clickViewLatestVersionLink();

              // Step 5: Verify the detail view shows User B's changes; User A's changes are NOT applied
              InventoryInstance.waitLoading();
              InventoryInstance.waitInstanceRecordViewOpened();
              InventoryInstance.checkInstanceTitle(testData.instanceTitleUpdatedByB);
              InventoryInstance.checkPresentedText(testData.instanceTitleUpdatedByA, false);
            });
          });
        });
      },
    );
  });
});
