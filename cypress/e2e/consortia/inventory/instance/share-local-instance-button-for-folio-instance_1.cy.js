import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance = instanceData;
      });

      cy.createTempUser([Permissions.uiInventoryViewCreateInstances.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C411345 (CONSORTIA) Check the "Share local instance" button without permission on a Source = FOLIO Instance on Central tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C411345'] },
      () => {
        InventoryInstances.searchByTitle(testData.instance.instanceTitle);
        InventoryInstance.waitLoading();
        InventoryInstance.checkShareLocalInstanceButtonIsAbsent();
      },
    );
  });
});
