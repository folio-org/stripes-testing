import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ContributorTypes from '../../../support/fragments/settings/inventory/instances/contributorTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C611_FolioInstance_${randomPostfix}`,
      topFiveTypes: [],
      bottomFiveTypes: [],
    };

    before('Get contributor types via API and create test data', () => {
      cy.getAdminToken();

      // Get only marcrelator contributor types (default ones) sorted by name
      ContributorTypes.getViaApi({ query: 'source<>local', limit: 500 }).then((types) => {
        const sorted = [...types].sort((a, b) => a.name.localeCompare(b.name));
        testData.topFiveTypes = sorted.slice(0, 5).map((t) => t.name);
        testData.bottomFiveTypes = sorted.slice(-5).map((t) => t.name);
      });

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
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

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.crudContributorTypes.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password);
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      if (testData.user?.userId) Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C611 Contributor --> Type --> (Validate matching settings) (promin)',
      { tags: ['extendedPath', 'promin', 'C611'] },
      () => {
        // Step 1: Navigate to Settings > Inventory > Contributor types and verify the list
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.CONTRIBUTOR_TYPES);
        ContributorTypes.waitLoading();

        // Verify top 5 and bottom 5 marcrelator types from API are shown in Settings list
        [...testData.topFiveTypes, ...testData.bottomFiveTypes].forEach((typeName) => {
          ContributorTypes.verifyContributorTypeShown({ name: typeName });
        });

        // Step 2: Open Inventory app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();

        // Step 3: Open the created instance and edit it
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        // Step 4: Open Type dropdown in Contributor section, verify it matches Settings list
        InstanceRecordEdit.clickAddContributor();
        InstanceRecordEdit.verifyAvailableContributorTypes([
          ...testData.topFiveTypes,
          ...testData.bottomFiveTypes,
        ]);
      },
    );
  });
});
