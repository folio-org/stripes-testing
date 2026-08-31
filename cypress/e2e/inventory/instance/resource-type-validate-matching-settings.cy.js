import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ResourceTypes from '../../../support/fragments/settings/inventory/instances/resourceTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C613_FolioInstance_${randomPostfix}`,
      topFiveTypes: [],
      bottomFiveTypes: [],
    };

    before('Get resource types via API and create test data', () => {
      cy.getAdminToken();

      // Get resource types (standard built-in ones) sorted by name
      cy.getInstanceTypes({ query: 'source<>local', limit: 500 }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
        const sorted = [...instanceTypes].sort((a, b) => a.name.localeCompare(b.name));
        testData.topFiveTypes = sorted.slice(0, 5).map((t) => t.name);
        testData.bottomFiveTypes = sorted.slice(-5).map((t) => t.name);
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

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.crudDefinedResourceTypes.gui,
      ]).then((userProperties) => {
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
      if (testData.user?.userId) Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C613 Descriptive Data --> Resource Type --> (Validate matching settings) (promin)',
      { tags: ['extendedPath', 'promin', 'C613'] },
      () => {
        // Steps 1-2: Open the created FOLIO instance
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 3: Edit instance and check the Resource type dropdown
        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        InstanceRecordEdit.verifyAvailableResourceTypes([
          ...testData.topFiveTypes,
          ...testData.bottomFiveTypes,
        ]);

        // Step 4: Navigate to Settings > Inventory > Resource types and verify the list matches
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.RESOURCE_TYPES);
        ResourceTypes.waitLoading();

        [...testData.topFiveTypes, ...testData.bottomFiveTypes].forEach((typeName) => {
          ResourceTypes.verifyResourceTypeShown({ name: typeName });
        });
      },
    );
  });
});
