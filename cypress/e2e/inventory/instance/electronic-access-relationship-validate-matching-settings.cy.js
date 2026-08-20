import { APPLICATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
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
      instanceTitle: `AT_C616_FolioInstance_${randomPostfix}`,
      relationships: [],
    };

    before('Get URL relationships via API and create test data', () => {
      cy.getAdminToken();

      // Get electronic access relationships
      UrlRelationship.getViaApi({ limit: 100, query: 'source<>local' }).then((relationships) => {
        testData.relationships = relationships.map((r) => r.name);
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

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiCreateEditDeleteURL.gui]).then(
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
      'C616 Electronic Access --> Relationship --> (Validate matching settings) (promin)',
      { tags: ['extendedPath', 'promin', 'C616'] },
      () => {
        // Step 1: Open the created FOLIO instance and edit it
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        // Step 2: Add electronic access row and verify the Relationship dropdown options
        InstanceRecordEdit.clickAddElectronicAccess();

        InstanceRecordEdit.verifyAvailableElectronicAccessRelationships(testData.relationships);

        // Close the edit form before navigating to Settings (form is dirty)
        InstanceRecordEdit.close();
        InstanceRecordEdit.closeCancelEditingModal();
        InventoryInstance.waitLoading();

        // Step 3: Navigate to Settings > Inventory > URL relationship and verify the list matches
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.URL_RELATIONSHIP);
        UrlRelationship.waitloading();

        testData.relationships.forEach((relationshipName) => {
          UrlRelationship.verifyUrlRelationshipShown({ name: relationshipName });
        });
      },
    );
  });
});
