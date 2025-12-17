import uuid from 'uuid';
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../../support/constants';
import ServicePoints from '../../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../../support/fragments/settings/tenant/location-setup/locations';
import ItemRecordView from '../../../../../support/fragments/inventory/item/itemRecordView';
import UpdateOwnershipModal from '../../../../../support/fragments/inventory/modals/updateOwnershipModal';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instanceTitle = `AT_C916234_FolioInstance_${randomPostfix}`;
        const barcodes = [uuid(), uuid(), uuid()];
        const holdingsAItemIds = [];
        let user;
        let instanceId;
        let holdingsAId;
        let holdingsBId;
        let locationA;
        let locationB;
        let materialType;
        let loanType;
        let sourceId;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiInventoryViewCreateEditItems.gui,
            Permissions.uiInventoryUpdateOwnership.gui,
          ]).then((userProperties) => {
            user = userProperties;

            // Assign user to all tenants
            cy.assignAffiliationToUser(Affiliations.College, user.userId);
            cy.assignAffiliationToUser(Affiliations.University, user.userId);

            // Set up test data in Central tenant
            cy.then(() => {
              // Create shared instance in Central
              InventoryInstance.createInstanceViaApi({
                instanceTitle,
              }).then((instanceData) => {
                instanceId = instanceData.instanceData.instanceId;
              });
            });

            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiInventoryViewCreateEditItems.gui,
              Permissions.uiInventoryUpdateOwnership.gui,
            ]);
            cy.then(() => {
              const locationAData = Locations.getDefaultLocation({
                servicePointId: ServicePoints.getDefaultServicePoint().id,
              }).location;
              locationAData.name = `HoldingsA_Loc_${randomPostfix}`;
              Locations.createViaApi(locationAData).then((loc) => {
                locationA = loc;
              });
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
                loanType = res[0];
              });
              cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
                materialType = matType;
              });
              InventoryHoldings.getHoldingSources({ limit: 1, query: '(name=="FOLIO")' }).then(
                (holdingSources) => {
                  sourceId = holdingSources[0].id;
                },
              );
            }).then(() => {
              // Create Holdings A in Member 1
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId,
                permanentLocationId: locationA.id,
                sourceId,
              }).then((holdings) => {
                holdingsAId = holdings.id;

                // Create 3 items in Holdings A with order 1, 2, 3
                for (let i = 1; i <= 3; i++) {
                  cy.createItem({
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    holdingsRecordId: holdingsAId,
                    materialType: { id: materialType.id },
                    permanentLoanType: { id: loanType.id },
                    order: i,
                    barcode: barcodes[i - 1],
                  }).then(({ body }) => {
                    holdingsAItemIds.push(body.id);
                  });
                }
              });
            });

            // Set up Holdings B in Member 2 (University) without items
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiInventoryViewCreateEditItems.gui,
              Permissions.uiInventoryUpdateOwnership.gui,
            ]);
            cy.then(() => {
              const locationBData = Locations.getDefaultLocation({
                servicePointId: ServicePoints.getDefaultServicePoint().id,
              }).location;
              locationBData.name = `HoldingsB_Loc_${randomPostfix}`;
              Locations.createViaApi(locationBData).then((loc) => {
                locationB = loc;
              });
            }).then(() => {
              // Create Holdings B in Member 2
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId,
                permanentLocationId: locationB.id,
                sourceId,
              }).then((holdings) => {
                holdingsBId = holdings.id;
              });
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Clean up in Member 1 (College)
          cy.setTenant(Affiliations.College);
          holdingsAItemIds.forEach((itemId) => {
            cy.deleteItemViaApi(itemId);
          });
          cy.deleteHoldingRecordViaApi(holdingsAId);
          Locations.deleteViaApi(locationA);

          // Clean up in Member 2 (University)
          cy.setTenant(Affiliations.University);
          holdingsAItemIds.forEach((itemId) => {
            cy.deleteItemViaApi(itemId);
          });
          cy.deleteHoldingRecordViaApi(holdingsBId);
          Locations.deleteViaApi(locationB);

          // Clean up in Central
          cy.resetTenant();
          InventoryInstance.deleteInstanceViaApi(instanceId);
          Users.deleteViaApi(user.userId);
        });

        it(
          'C916234 Update ownership of 1 "Item" record to "Holdings" without items (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C916234'] },
          () => {
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(instanceId);
            InventoryInstances.selectInstanceById(instanceId);
            InventoryInstance.waitLoading();

            // Step 1: Update item ownership from Member 1 to Member 2
            InstanceRecordView.openHoldingItem({
              name: locationA.name,
              barcode: barcodes.at(-1),
            });
            ItemRecordView.waitLoading();
            ItemRecordView.clickUpdateOwnership();
            UpdateOwnershipModal.updateHoldings(tenantNames.university, locationB.name);
            InventoryInstance.waitLoading();

            // Step 3: Expand Holdings B accordion and check moved item's order field
            InstanceRecordView.verifyConsortiaHoldingsAccordion(instanceId, false);
            InstanceRecordView.expandConsortiaHoldings();
            InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.University);
            InstanceRecordView.expandMemberSubHoldings(tenantNames.university);
            InstanceRecordView.verifyIsHoldingsCreated([`${locationB.name} >`]);
            InventoryInstance.openHoldingsAccordion(locationB.name);

            InventoryInstance.checkItemOrderValueInHoldings(locationB.name, 0, 1, false);
          },
        );
      });
    });
  });
});
