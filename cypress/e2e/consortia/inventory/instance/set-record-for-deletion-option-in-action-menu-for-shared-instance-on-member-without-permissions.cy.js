import { Permissions } from '../../../../support/dictionary';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
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
    describe('Consortia', () => {
      const testData = {};

      before('Create test data and login', () => {
        cy.getAdminToken().then(() => {
          cy.getConsortiaId().then((consortiaId) => {
            testData.consortiaId = consortiaId;

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
          });
        });

        cy.resetTenant();
        cy.getAdminToken();
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);

          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.College);
          InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        });
      });

      it(
        'C436843 (CONSORTIA) Check "Set record for deletion" option in Actions menu for Local instance on Member tenant (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C436843'] },
        () => {
          InstanceRecordView.waitLoading();
          InstanceRecordView.validateOptionInActionsMenu(
            actionsMenuOptions.setRecordForDeletion,
            false,
          );
        },
      );
    });
  });
});
