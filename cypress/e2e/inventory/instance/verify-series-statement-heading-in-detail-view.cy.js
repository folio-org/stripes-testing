import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      instanceTitle: `AT_C422032_FolioInstance_${getRandomPostfix()}`,
      user: {},
      instanceId: null,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: testData.instanceTitle,
          },
        }).then(({ instanceId }) => {
          testData.instanceId = instanceId;
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      if (testData.instanceId) InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C422032 Verify that Series Statement heading has not vanished in detailed view (promin)',
      { tags: ['extendedPath', 'promin', 'C422032'] },
      () => {
        // Step 1: Search for instance with no Series Statement data
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventoryInstances.verifySearchResultIncludingValue(testData.instanceTitle);

        // Step 2: Open instance; verify Series Statement heading is visible with a dash when empty
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.verifySeriesStatement(0);
      },
    );
  });
});
