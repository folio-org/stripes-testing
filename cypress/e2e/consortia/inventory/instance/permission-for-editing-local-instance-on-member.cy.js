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
    describe('Consortia', () => {
      const testData = {
        newInstanceTitle: `C407749 instanceTitle${getRandomPostfix()}`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });

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
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceTitle);
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            InstanceRecordView.edit();
            InstanceRecordEdit.waitLoading();
            InstanceRecordEdit.fillResourceTitle(testData.newInstanceTitle);
            InstanceRecordEdit.saveAndClose();
            InteractorsTools.checkCalloutMessage(
              `The instance - HRID ${initialInstanceHrId} has been successfully saved.`,
            );
          });
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.verifyResourceTitle(testData.newInstanceTitle);
        },
      );
    });
  });
});
