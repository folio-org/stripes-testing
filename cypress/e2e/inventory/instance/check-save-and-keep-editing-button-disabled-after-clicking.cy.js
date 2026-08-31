import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C523737_FolioInstance_${randomPostfix}`,
    };

    before('Create test data', () => {
      cy.getAdminToken();

      cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });

      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
        }).then((createdInstance) => {
          testData.instanceId = createdInstance.instanceId;
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      Users.deleteViaApi(testData.user?.userId);
    });

    it(
      'C523737 Check that "Save & keep editing" button disabled after clicking it one time (promin)',
      { tags: ['extendedPath', 'promin', 'C523737'] },
      () => {
        const updatedTitle = `${testData.instanceTitle} Test`;

        // Step 1: Search for instance and open detail view
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 2: Click Actions → Edit instance
        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        // Step 3: Add "Test" to Resource title field, click Save & keep editing;
        // verify button becomes disabled immediately, form remains open, changes saved
        InstanceRecordEdit.editResourceTitle(updatedTitle);
        InstanceRecordEdit.clickSaveAndKeepEditingButton();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.verifyTitle(updatedTitle);
      },
    );
  });
});
