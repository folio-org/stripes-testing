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
      cy.setTenant(Affiliations.College);
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.firstLocalInstance = instanceData;

        cy.getInstanceById(instanceData.instanceId).then((instance) => {
          testData.firstLocalInstance.instanceHRID = instance.hrid;
        });
      });
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.secondLocalInstance = instanceData;

        cy.getInstanceById(instanceData.instanceId).then((instance) => {
          testData.secondLocalInstance.instanceHRID = instance.hrid;
        });
      });
      cy.resetTenant();

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.assignAffiliationToUser(Affiliations.College, user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);
        cy.resetTenant();

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
      cy.setTenant(Affiliations.College);
      InventoryInstance.deleteInstanceViaApi(testData.secondLocalInstance.instanceId);
      InventoryInstance.deleteInstanceViaApi(testData.firstLocalInstance.instanceId);
    });

    it(
      'C413367 (CONSORTIA) Adding Local child Instances to Local Instance on Member tenant (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet', 'C413367'] },
      () => {
        InventoryInstances.searchByTitle(testData.firstLocalInstance.instanceId);
        InventoryInstances.selectInstance();
        InstanceRecordView.waitLoading();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.addChildInstances(testData.secondLocalInstance.instanceTitle);
        InstanceRecordEdit.verifyChildInstance(
          testData.secondLocalInstance.instanceTitle,
          testData.secondLocalInstance.instanceHRID,
        );
        InstanceRecordEdit.selectChildRelationshipType('bound-with');
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifyCalloutMessage(
          `The instance - HRID ${testData.firstLocalInstance.instanceHRID} has been successfully saved.`,
        );
      },
    );
  });
});
