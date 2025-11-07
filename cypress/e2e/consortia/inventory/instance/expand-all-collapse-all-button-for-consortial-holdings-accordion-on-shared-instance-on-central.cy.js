import { APPLICATION_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        instanceTitle: `AT_C436939_FolioInstance${getRandomPostfix()}`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;

          cy.setTenant(Affiliations.College);
          InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
            testData.instanceId = instanceData.instanceId;

            InventoryInstance.shareInstanceViaApi(
              testData.instanceId,
              testData.consortiaId,
              Affiliations.College,
              Affiliations.Consortia,
            );
          });
        });
        cy.resetTenant();

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });

      it(
        'C436939 (CONSORTIA) Check Expand All/Collapse all button for Consortial holdings accordion on shared Instance on Central Tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C436939'] },
        () => {
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.expandAllInConsortialHoldingsAccordion(testData.instanceId);
          InstanceRecordView.verifyHoldingsListIsEmpty(testData.instanceId);
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.instanceId, true);
          InstanceRecordView.collapseAllInConsortialHoldingsAccordion(testData.instanceId);
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.instanceId, false);
        },
      );
    });
  });
});
