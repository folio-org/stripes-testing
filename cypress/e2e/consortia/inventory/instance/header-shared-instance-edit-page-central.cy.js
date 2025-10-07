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

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {};

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;
        });
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

        cy.resetTenant();
        cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          },
        );
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        cy.resetTenant();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C404355 (CONSORTIA) Verify the header of a shared Instance on edit page for the Central tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C404355'] },
        () => {
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          cy.reload();
          InventoryInstance.waitLoading();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.checkInstanceHeader(
            ` Edit shared instance • ${testData.instance.instanceTitle}`,
          );
        },
      );
    });
  });
});
