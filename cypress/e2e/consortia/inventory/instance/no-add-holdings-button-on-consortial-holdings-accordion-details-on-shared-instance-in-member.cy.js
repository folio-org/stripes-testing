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

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {};

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;

          cy.setTenant(Affiliations.College);
          cy.getLocations({ query: `name="${LOCATION_NAMES.DCB_UI}"` }).then((res) => {
            testData.collegeLocation = res;

            InventoryHoldings.getHoldingSources({
              limit: 1,
              query: `(name=="${HOLDINGS_SOURCE_NAMES.FOLIO}")`,
            }).then((holdingSources) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.instance.instanceId,
                permanentLocationId: testData.collegeLocation.id,
                sourceId: holdingSources[0].id,
              }).then((holding) => {
                testData.collegeHolding = holding;
              });
            });
          });
        });
        cy.resetTenant();

        cy.createTempUser([Permissions.uiInventoryViewCreateInstances.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.uiInventoryViewCreateInstances.gui,
            ]);
            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.uiInventoryViewCreateInstances.gui,
            ]);
            cy.resetTenant();

            cy.login(testData.user.username, testData.user.password);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
          },
        );
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryHoldings.deleteHoldingRecordViaApi(testData.collegeHolding.id);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      });

      it(
        'C411651 (CONSORTIA) Verify no Add holdings button on Consortial holdings accordion details on shared Instance in Member Tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C411651'] },
        () => {
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventorySearchAndFilter.searchInstanceByTitle(testData.instance.instanceId);
          InventoryInstances.selectInstance();
          InventoryInstance.waitInstanceRecordViewOpened();
          InstanceRecordView.verifyConsortiaHoldingsAccordion(testData.instance.instanceId, false);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.College);
          InstanceRecordView.expandMemberSubHoldings(tenantNames.college);
          InstanceRecordView.verifyMemberSubSubHoldingsAccordion(
            tenantNames.college,
            Affiliations.College,
            testData.collegeHolding.id,
          );
          InstanceRecordView.verifyAddHoldingsButtonIsAbsent();
        },
      );
    });
  });
});
