import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    let user;
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.sharedInstance = instanceData;

        cy.getInstanceById(instanceData.instanceId).then((instance) => {
          testData.sharedInstance.instanceHRID = instance.hrid;
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.localInstance = instanceData;
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.sharedInstance.instanceId);
      cy.setTenant(Affiliations.College);
      InventoryInstance.deleteInstanceViaApi(testData.localInstance.instanceId);
    });

    it(
      'C413365 (CONSORTIA) Adding Shared child Instance to Local Instance on Member tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C413365'] },
      () => {
        InventoryInstances.searchByTitle(testData.localInstance.instanceTitle);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.addChildInstance(testData.sharedInstance.instanceTitle);
        InstanceRecordEdit.verifyChildInstance(
          testData.sharedInstance.instanceTitle,
          testData.sharedInstance.instanceHRID,
        );
        InstanceRecordEdit.selectChildRelationshipType('bound-with');
        InstanceRecordEdit.saveAndClose();
        InstanceRecordEdit.verifyShareParentLinkingError();
      },
    );
  });
});
