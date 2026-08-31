import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Formats from '../../../support/fragments/settings/inventory/instances/formats';
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
      instanceTitle: `AT_C614_FolioInstance_${randomPostfix}`,
      topFiveFormats: [],
      bottomFiveFormats: [],
    };

    before('Get formats via API and create test data', () => {
      cy.getAdminToken();

      // Get formats (standard built-in ones) sorted by name
      Formats.getViaApi({ query: 'source<>local', limit: 500 }).then((formats) => {
        const sorted = [...formats].sort((a, b) => a.name.localeCompare(b.name));
        testData.topFiveFormats = sorted.slice(0, 5).map((f) => f.name);
        testData.bottomFiveFormats = sorted.slice(-5).map((f) => f.name);
      });

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

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.crudFormats.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      if (testData.user?.userId) Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C614 Descriptive Data --> Format --> (Validate matching settings) (promin)',
      { tags: ['extendedPath', 'promin', 'C614'] },
      () => {
        // Steps 1-2: Open the created FOLIO instance and edit it
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        // Step 3: Add a format row and verify the Format dropdown options
        InstanceRecordEdit.addFormats();

        InstanceRecordEdit.verifyAvailableFormats([
          ...testData.topFiveFormats,
          ...testData.bottomFiveFormats,
        ]);

        // Close the edit form before navigating to Settings (form is dirty)
        InstanceRecordEdit.close();
        InstanceRecordEdit.closeCancelEditingModal();
        InventoryInstance.waitLoading();

        // Step 4: Navigate to Settings > Inventory > Formats and verify the list matches
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.FORMATS);
        Formats.waitLoading();

        [...testData.topFiveFormats, ...testData.bottomFiveFormats].forEach((formatName) => {
          Formats.verifyFormatShown({ name: formatName });
        });
      },
    );
  });
});
