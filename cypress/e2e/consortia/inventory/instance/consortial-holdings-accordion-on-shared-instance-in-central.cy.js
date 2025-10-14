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
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {};

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.sharedInstance = instanceData;

          // adding Holdings in College tenant
          cy.setTenant(Affiliations.College);
          cy.getLocations({ query: `name="${LOCATION_NAMES.DCB_UI}"` }).then((res) => {
            testData.collegeLocation = res;

            InventoryHoldings.getHoldingSources({
              limit: 1,
              query: `(name=="${HOLDINGS_SOURCE_NAMES.FOLIO}")`,
            }).then((holdingSources) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.sharedInstance.instanceId,
                permanentLocationId: testData.collegeLocation.id,
                sourceId: holdingSources[0].id,
              }).then((holding) => {
                testData.collegeHolding = holding;
              });
            });
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
        cy.setTenant(Affiliations.College);
        InventoryHoldings.deleteHoldingRecordViaApi(testData.collegeHolding.id);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.sharedInstance.instanceId);
      });

      it(
        'C411614 (CONSORTIA) Verify the Consortial holdings accordion on shared Instance in Central Tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411614'] },
        () => {
          InventoryInstances.searchByTitle(testData.sharedInstance.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyConsortiaHoldingsAccordion(false);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.College);
        },
      );
    });
  });
});
