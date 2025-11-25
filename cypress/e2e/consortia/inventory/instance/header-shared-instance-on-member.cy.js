import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {};

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });

        cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.uiInventoryViewCreateEditInstances.gui,
            ]);

            cy.resetTenant();
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          },
        );
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C404384 (CONSORTIA) Verify the header of a shared Instance on the Member tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C404384'] },
        () => {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.instance.instanceTitle);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.checkInstanceHeader(
            `Shared instance • ${testData.instance.instanceTitle} `,
          );
        },
      );
    });
  });
});
