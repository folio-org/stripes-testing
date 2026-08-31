import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import AlternativeTitleTypes from '../../../support/fragments/settings/inventory/instances/alternativeTitleTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('Instance', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C608_FolioInstance_${randomPostfix}`,
      topFiveTypes: [],
      bottomFiveTypes: [],
    };

    before('Get alternative title types via API and create test data', () => {
      cy.getAdminToken();

      // Get only folio-source alternative title types (default ones) sorted by name
      AlternativeTitleTypes.getViaApi({ query: 'source<>local', limit: 500 }).then((types) => {
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

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.crudAlternativeTitleTypes.gui,
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
      'C608 In the Title Data --> Go to the Alternative Title type --> (Validate matching settings) (promin)',
      { tags: ['extendedPath', 'promin', 'C608'] },
      () => {
        // Steps 1-2: Open Inventory and search for the created FOLIO instance
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 3: Edit instance
        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        // Step 4: Open Alternative title type dropdown and verify it contains folio types
        InstanceRecordEdit.clickAddAlternativeTitle();
        InstanceRecordEdit.verifyAvailableAlternativeTitleTypes([
          ...testData.topFiveTypes,
          ...testData.bottomFiveTypes,
        ]);
        InstanceRecordEdit.close();
        InstanceRecordEdit.closeCancelEditingModal();
        InventoryInstance.waitLoading();

        // Step 5: Navigate to Settings > Inventory > Alternative title types and verify the list
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.ALTERNATIVE_TITLE_TYPES);
        AlternativeTitleTypes.waitLoading();

        [...testData.topFiveTypes, ...testData.bottomFiveTypes].forEach((typeName) => {
          AlternativeTitleTypes.verifyAlternativeTitleTypeShown({ name: typeName });
        });
      },
    );
  });
});
