import { APPLICATION_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      let user;
      const testData = {};

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([]).then((userProperties) => {
          user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(user.userId, [Permissions.inventoryAll.gui]);
          InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
            testData.firstLocalInstance = instanceData;

            cy.getInstanceById(testData.firstLocalInstance.instanceId).then((instance) => {
              testData.firstLocalInstance.instanceHRID = instance.hrid;
            });
          });
          InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
            testData.secondLocalInstance = instanceData;

            cy.getInstanceById(testData.secondLocalInstance.instanceId).then((instance) => {
              testData.secondLocalInstance.instanceHRID = instance.hrid;
            });
          });
          cy.resetTenant();

          cy.login(user.username, user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
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
        'C413371 (CONSORTIA) Adding Local parent Instances to Local Instance on Member tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C413371'] },
        () => {
          InventoryInstances.searchByTitle(testData.firstLocalInstance.instanceTitle);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.addParentInstance(testData.secondLocalInstance.instanceTitle);
          InstanceRecordEdit.verifyParentInstance(
            testData.secondLocalInstance.instanceTitle,
            testData.secondLocalInstance.instanceHRID,
          );
          InstanceRecordEdit.selectParentRelationshipType('bound-with');
          InstanceRecordEdit.saveAndClose();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InteractorsTools.checkCalloutMessage(
            `The instance - HRID ${testData.firstLocalInstance.instanceHRID} has been successfully saved.`,
          );
        },
      );
    });
  });
});
