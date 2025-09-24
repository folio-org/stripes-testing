import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      let user;
      const testData = {
        instanceTitle: `C405564 autoTestInstanceTitle${getRandomPostfix()}`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });

        cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
          (userProperties) => {
            user = userProperties;

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          },
        );
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      });

      it(
        'C405564 (CONSORTIA) Verify the action for creating new shared instances for Central tenant (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C405564'] },
        () => {
          const InventoryNewInstance = InventoryInstances.addNewInventory();
          InventoryNewInstance.fillRequiredValues(testData.instanceTitle);
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.checkInstanceDetails({
            instanceInformation: [{ key: 'Source', value: INSTANCE_SOURCE_NAMES.FOLIO }],
          });
        },
      );
    });
  });
});
