import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstanceSelectInstanceModal from '../../../../support/fragments/inventory/modals/inventoryInstanceSelectInstanceModal';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {};

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.sharedInstance = instanceData;
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.localInstance = instanceData;
        });
        cy.resetTenant();

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.sharedInstance.instanceId);
      Users.deleteViaApi(testData.user.userId);
      cy.resetTenant();
      cy.getAdminToken();
      cy.setTenant(Affiliations.University);
      InventoryInstance.deleteInstanceViaApi(testData.localInstance.instanceId);
    });

    it(
      'C594479 (CONSORTIA) Shared instances facet is available in "Move holdings/items to another instance" modal window (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet', 'C594479'] },
      () => {
        InventoryInstances.searchByTitle(testData.localInstance.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.moveHoldingsItemsToAnotherInstance();
        InventoryInstanceSelectInstanceModal.waitLoading();
        InventoryInstanceSelectInstanceModal.verifySharedFacetExistsInFilter();
        InventoryInstanceSelectInstanceModal.searchByHrId(testData.sharedInstance.hrid);
      },
    );
  });
});
