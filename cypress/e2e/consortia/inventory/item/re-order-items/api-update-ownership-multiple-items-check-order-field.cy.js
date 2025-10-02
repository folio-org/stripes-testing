import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../../support/fragments/inventory/item/inventoryItems';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import Affiliations from '../../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import { ITEM_STATUS_NAMES } from '../../../../../support/constants';
import ServicePoints from '../../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../../support/fragments/settings/tenant/location-setup/locations';

describe.skip('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instanceTitle = `AT_C812992_FolioInstance_${randomPostfix}`;
        const holdingsAItemIds = [];
        const holdingsBItemIds = [];
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
            Permissions.uiInventoryViewCreateEditHoldings.gui,
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

            // Set up Holdings A in Member 1 (College) with 6 items
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiInventoryViewCreateEditHoldings.gui,
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

                // Create 6 items in Holdings A with order 1, 2, 3, 4, 5, 6
                for (let i = 1; i <= 6; i++) {
                  cy.createItem({
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    holdingsRecordId: holdingsAId,
                    materialType: { id: materialType.id },
                    permanentLoanType: { id: loanType.id },
                    order: i,
                  }).then(({ body }) => {
                    holdingsAItemIds.push(body.id);
                  });
                }
              });
            });

            // Set up Holdings B in Member 2 (University) with 2 items
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiInventoryViewCreateEditHoldings.gui,
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

                // Create 2 items in Holdings B with order 1, 2
                for (let i = 1; i <= 2; i++) {
                  cy.createItem({
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    holdingsRecordId: holdingsBId,
                    materialType: { id: materialType.id },
                    permanentLoanType: { id: loanType.id },
                    barcode: `ItemB${i}_${randomPostfix}`,
                    enumeration: `vol.${i}`,
                    order: i,
                  }).then(({ body }) => {
                    holdingsBItemIds.push(body.id);
                  });
                }
              });
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Clean up in Member 1 (College)
          cy.setTenant(Affiliations.College);
          [...holdingsAItemIds, ...holdingsBItemIds].forEach((itemId) => {
            cy.deleteItemViaApi(itemId);
          });
          cy.deleteHoldingRecordViaApi(holdingsAId);
          Locations.deleteViaApi(locationA);

          // Clean up in Member 2 (University)
          cy.setTenant(Affiliations.University);
          [...holdingsAItemIds, ...holdingsBItemIds].forEach((itemId) => {
            cy.deleteItemViaApi(itemId);
          });
          cy.deleteHoldingRecordViaApi(holdingsBId);
          Locations.deleteViaApi(locationB);

          // Clean up in Central
          cy.resetTenant();
          InventoryInstance.deleteInstanceViaApi(instanceId);
          Users.deleteViaApi(user.userId);
        });

        // Trillium+ only
        it(
          'C812992 API Update ownership of multiple "Item" records and check "order" field (spitfire)',
          { tags: [] },
          () => {
            cy.resetTenant();
            cy.getToken(user.username, user.password);
            // Step 1: Send POST request to update ownership of items 1-5 from Holdings A to Holdings B
            const itemsToMove = holdingsAItemIds.slice(0, 5);
            cy.setTenant(Affiliations.College);
            InventoryItems.updateItemsOwnershipViaApi(
              itemsToMove,
              holdingsBId,
              Affiliations.University,
            ).then((response) => {
              expect(response.status).to.equal(200);

              // Step 2: Send GET request to see check orders values in Holdings B
              cy.setTenant(Affiliations.University);
              InventoryItems.getItemsInHoldingsViaApi(holdingsBId).then((itemsInHoldings) => {
                const orderSequence = itemsInHoldings.map((item) => item.order);
                expect(orderSequence).to.deep.equal([1, 2, 3, 4, 5, 6, 7]);
              });
            });
          },
        );
      });
    });
  });
});
