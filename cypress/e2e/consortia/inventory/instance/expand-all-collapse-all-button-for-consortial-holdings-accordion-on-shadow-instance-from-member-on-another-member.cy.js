import {
  APPLICATION_NAMES,
  HOLDINGS_SOURCE_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        instanceTitle: `AT_C436944_FolioInstance${getRandomPostfix()}`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;

          cy.setTenant(Affiliations.College);
          InventoryInstance.createInstanceViaApi()
            .then(({ instanceData }) => {
              testData.instanceId = instanceData.instanceId;

              cy.getLocations({ query: `name="${LOCATION_NAMES.DCB_UI}"` }).then((res) => {
                testData.collegeLocation = res;

                InventoryHoldings.getHoldingSources({
                  limit: 1,
                  query: `(name=="${HOLDINGS_SOURCE_NAMES.FOLIO}")`,
                }).then((holdingSources) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: testData.instanceId,
                    permanentLocationId: testData.collegeLocation.id,
                    sourceId: holdingSources[0].id,
                  }).then((holding) => {
                    testData.holdingId = holding.id;
                  });
                });
              });
            })
            .then(() => {
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

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.inventoryAll.gui]);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryHoldings.deleteHoldingRecordViaApi(testData.holdingId);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });

      it(
        'C436944 (CONSORTIA) Check "Expand All/Collapse all" button for Consortial holdings accordion on Shadow Instance from Member Tenant on another Member Tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C436944'] },
        () => {
          InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.expandAllInConsortialHoldingsAccordion(testData.instanceId);
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.instanceId, true);
          InstanceRecordView.verifySubHoldingsAccordion(
            Affiliations.College,
            testData.holdingId,
            'true',
          );
          InstanceRecordView.collapseAllInConsortialHoldingsAccordion(testData.instanceId);
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.instanceId, false);

          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          InventorySearchAndFilter.searchInstanceByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.expandAllInConsortialHoldingsAccordion(testData.instanceId);
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.instanceId, true);
          InstanceRecordView.verifySubHoldingsAccordion(
            Affiliations.College,
            testData.holdingId,
            'true',
          );
          InstanceRecordView.collapseAllInConsortialHoldingsAccordion(testData.instanceId);
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.instanceId, false);
        },
      );
    });
  });
});
