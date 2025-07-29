import { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView, {
  actionsMenuOptions,
} from '../../../../support/fragments/inventory/instanceRecordView';
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

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiRequestsAll.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
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
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    });

    it(
      'C411688 (CONSORTIA) Verify the absence of the "New request" button on Instance details Action menu of Central Tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C411688'] },
      () => {
        InventoryInstances.searchByTitle(testData.instance.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.validateOptionInActionsMenu(actionsMenuOptions.newRequest, false);
      },
    );
  });
});
