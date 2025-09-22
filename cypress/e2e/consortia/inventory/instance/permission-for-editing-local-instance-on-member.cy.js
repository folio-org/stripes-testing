import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      newInstanceTitle: `C407749 instanceTitle${getRandomPostfix()}`,
    };

    before('Create test data', () => {
      cy.getAdminToken();

      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui])
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
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
          InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
            testData.instance = instanceData;
          });
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
    });

    it(
      'C407749 (CONSORTIA) Verify the permission for editing local instances on Member tenant (consortia) (folijet)',
      { tags: ['smokeECS', 'folijet', 'C407749'] },
      () => {
        InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.fillResourceTitle(testData.newInstanceTitle);
        InstanceRecordEdit.saveAndClose();
        InteractorsTools.checkCalloutMessage(
          'This shared instance has been saved centrally, and updates to associated member library records are in process. Changes in this copy of the instance may not appear immediately.',
        );
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifyResourceTitle(testData.newInstanceTitle);
      },
    );
  });
});
