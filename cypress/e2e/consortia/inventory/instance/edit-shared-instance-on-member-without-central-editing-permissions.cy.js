import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {
      newInstanceTitle: `C407750 instanceTitle${getRandomPostfix()}`,
      servicePoint: ServicePoints.defaultServicePoint,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getConsortiaId().then((consortiaId) => {
        testData.consortiaId = consortiaId;
      });
      cy.setTenant(Affiliations.College);
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance1 = instanceData;
      });
      InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
        testData.instance2 = instanceData;
        InventoryInstance.shareInstanceViaApi(
          testData.instance2.instanceId,
          testData.consortiaId,
          Affiliations.College,
          Affiliations.Consortia,
        );
      });

      cy.resetTenant();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(testData.user.userId, [
          Permissions.uiInventoryViewCreateEditInstances.gui,
        ]);
      });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.setTenant(Affiliations.College);
      InventoryInstance.deleteInstanceViaApi(testData.instance1.instanceId);
      InventoryInstance.deleteInstanceViaApi(testData.instance2.instanceId);
      cy.resetTenant();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C407750 (CONSORTIA) Verify that user cant edit shared instance on Member tenant without Central tenant Instance editing permission (folijet)',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        cy.login(testData.user.username, testData.user.password);
        cy.visit(TopMenu.inventoryPath);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        InventoryInstances.searchByTitle(testData.instance1.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.fillResourceTitle(testData.newInstanceTitle);
        InstanceRecordEdit.saveAndClose();

        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.verifyResourceTitle(testData.newInstanceTitle);

        cy.login(testData.user.username, testData.user.password);
        cy.visit(TopMenu.inventoryPath);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

        InventoryInstances.searchByTitle(testData.instance2.instanceId);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        InventoryInstance.checkEditInstanceButtonIsAbsent();
      },
    );
  });
});
