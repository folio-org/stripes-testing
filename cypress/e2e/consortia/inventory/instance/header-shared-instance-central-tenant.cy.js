import Affiliations from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getConsortiaId().then((consortiaId) => {
        testData.consortiaId = consortiaId;
      });
      cy.setTenant(Affiliations.College);
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;
        InventoryInstance.shareInstanceViaApi(
          testData.instance.instanceId,
          testData.consortiaId,
          Affiliations.College,
          Affiliations.Consortia,
        );
      });

      cy.resetTenant();
      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
        (userProperties) => {
          testData.user = userProperties;
        },
      );
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.setTenant(Affiliations.College);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      cy.resetTenant();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C404385 (CONSORTIA) Verify the header of a shared Instance on the Central tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

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
