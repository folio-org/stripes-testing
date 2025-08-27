import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      user: {},
      instanceTitle: `AT_C399069_Instance_${getRandomPostfix()}`,
      updatedTitle: `AT_C399069_Updated_Instance_${getRandomPostfix()}`,
    };

    let instanceId;

    before('Create test data', () => {
      cy.getAdminToken();
      // Create a FOLIO instance for testing
      InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
        ({ instanceData }) => {
          instanceId = instanceData.instanceId;
        },
      );

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(instanceId);
    });

    it(
      'C399069 Saving record using "Save & keep editing" button when editing an "Instance" record with source "FOLIO" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C399069'] },
      () => {
        cy.waitForAuthRefresh(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.reload();
        }, 20_000);
        InventoryInstances.waitContentLoading();

        // Step 1: Find any Instance record with source "FOLIO"
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.FOLIO);

        // Step 2: Click on "Title" value in any row in second pane (already done in Step 1)
        // Step 3: Click on "Actions" in the third pane → Select "Edit instance"
        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.checkButtonsEnabled({
          saveAndClose: false,
          saveKeepEditing: false,
          cancel: true,
        });

        // Step 4: Update value in any field (update instance title as requested instead of resource type)
        InstanceRecordEdit.fillResourceTitle(testData.updatedTitle);
        InstanceRecordEdit.checkButtonsEnabled({
          saveAndClose: true,
          saveKeepEditing: true,
          cancel: true,
        });

        // Step 6: Click on the "Save & keep editing" button
        InstanceRecordEdit.clickSaveAndKeepEditingButton();
        InstanceRecordEdit.verifySuccessfulMessage();
        InstanceRecordEdit.waitLoading();
        InventoryInstance.verifyInstanceTitle(testData.updatedTitle);
        InventoryInstance.verifyLastUpdatedDate();
        InventoryInstance.verifyLastUpdatedSource(testData.user.firstName, testData.user.lastName);

        // Step 8: Close the "Edit instance" window
        InstanceRecordEdit.close();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyInstanceTitle(testData.updatedTitle);
      },
    );
  });
});
