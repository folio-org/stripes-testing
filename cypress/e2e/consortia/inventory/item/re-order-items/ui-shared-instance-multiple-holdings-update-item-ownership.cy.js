import uuid from 'uuid';
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../../support/fragments/inventory/item/inventoryItems';
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

describe.skip('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instanceTitle = `AT_C808510_FolioInstance_${randomPostfix}`;

        const testData = {
          holdingsA: {
            itemsCount: 3,
          },
          holdingsB: {
            itemsCount: 2,
          },
          itemBarcode: uuid(),
        };

        const collegeItemIds = [];
        const universityItemIds = [];
        let user;
        let instanceId;
        let holdingsAId;
        let holdingsBId;
        let locationA;
        let locationB;
        let materialTypeA;
        let materialTypeB;
        let loanTypeA;
        let loanTypeB;
        let sourceId;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            // Permissions.uiInventoryViewCreateEditHoldings.gui,
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

            // Set up Holdings A in Member 1 (College)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewInstances.gui,
              // Permissions.uiInventoryViewCreateEditHoldings.gui,
              Permissions.uiInventoryViewCreateEditItems.gui,
              Permissions.uiInventoryUpdateOwnership.gui,
            ]);
            cy.then(() => {
              const locationAData = Locations.getDefaultLocation({
                servicePointId: ServicePoints.getDefaultServicePoint().id,
              }).location;
              Locations.createViaApi(locationAData).then((loc) => {
                locationA = loc;
              });
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
                loanTypeA = res[0];
              });
              cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
                materialTypeA = matType;
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
              }).then((holdingA) => {
                holdingsAId = holdingA.id;

                // Create 3 items in Holdings A with order 1, 2, 3
                for (let i = 1; i <= testData.holdingsA.itemsCount; i++) {
                  cy.createItem({
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    ...(i === 1 && { barcode: testData.itemBarcode }), // assign barcode for the first item only
                    holdingsRecordId: holdingsAId,
                    materialType: { id: materialTypeA.id },
                    permanentLoanType: { id: loanTypeA.id },
                    order: i,
                  }).then(({ body }) => {
                    collegeItemIds.push(body.id);
                  });
                }
              });
            });

            // Set up Holdings B in Member 2 (University)
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewInstances.gui,
              // Permissions.uiInventoryViewCreateEditHoldings.gui,
              Permissions.uiInventoryViewCreateEditItems.gui,
              Permissions.uiInventoryUpdateOwnership.gui,
            ]);
            cy.then(() => {
              const locationBData = Locations.getDefaultLocation({
                servicePointId: ServicePoints.getDefaultServicePoint().id,
              }).location;
              Locations.createViaApi(locationBData).then((loc) => {
                locationB = loc;
              });
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
                loanTypeB = res[0];
              });
              cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
                materialTypeB = matType;
              });
            }).then(() => {
              // Create Holdings B in Member 2
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId,
                permanentLocationId: locationB.id,
                callNumber: testData.holdingsB.callNumber,
                sourceId,
              }).then((holdingB) => {
                holdingsBId = holdingB.id;

                // Create 5 items in Holdings B with order 1, 2, 3, 4, 5
                for (let i = 1; i <= testData.holdingsB.itemsCount; i++) {
                  cy.createItem({
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    holdingsRecordId: holdingsBId,
                    materialType: { id: materialTypeB.id },
                    permanentLoanType: { id: loanTypeB.id },
                    order: i,
                  }).then(({ body }) => {
                    universityItemIds.push(body.id);
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
          cy.withinTenant(Affiliations.College, () => {
            collegeItemIds.forEach((itemId) => {
              cy.deleteItemViaApi(itemId);
            });
            universityItemIds.forEach((itemId) => {
              cy.deleteItemViaApi(itemId);
            });
            cy.deleteHoldingRecordViaApi(holdingsAId);
            Locations.deleteViaApi(locationA);
          });
          // Clean up in Member 2 (University)
          cy.withinTenant(Affiliations.University, () => {
            collegeItemIds.forEach((itemId) => {
              cy.deleteItemViaApi(itemId);
            });
            universityItemIds.forEach((itemId) => {
              cy.deleteItemViaApi(itemId);
            });
            cy.deleteHoldingRecordViaApi(holdingsBId);
            Locations.deleteViaApi(locationB);
          });
          // Clean up in Central
          cy.resetTenant();
          InventoryInstance.deleteInstanceViaApi(instanceId);
          Users.deleteViaApi(user.userId);
        });

        // Trillium+ only
        it(
          'C808510 Update ownership of 1 "Item" record and check "order" field (spitfire)',
          { tags: [] },
          () => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(instanceId);
            InventoryInstances.selectInstanceById(instanceId);
            InventoryInstance.waitLoading();

            // Step 1: Update item ownership from Member 1 to Member 2
            InstanceRecordView.openHoldingItem({
              name: locationA.name,
              barcode: testData.itemBarcode,
            });
            ItemRecordView.waitLoading();
            ItemRecordView.clickUpdateOwnership();
            UpdateOwnershipModal.updateHoldings(tenantNames.university, locationB.name);
            InventoryInstance.waitLoading();

            // Step 3: Expand Holdings A accordion and check the order field
            InstanceRecordView.verifyConsortiaHoldingsAccordion(false);
            InstanceRecordView.expandConsortiaHoldings();
            InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.University);
            InstanceRecordView.expandMemberSubHoldings(tenantNames.university);
            InstanceRecordView.verifyIsHoldingsCreated([`${locationB.name} >`]);
            InventoryInstance.openHoldingsAccordion(locationB.name);

            cy.setTenant(Affiliations.University);
            InventoryItems.getItemsInHoldingsViaApi(holdingsBId).then((itemsInHoldingsB) => {
              const orderSequence = itemsInHoldingsB.map((item) => item.order);
              cy.wrap(orderSequence).should('deep.equal', [1, 2, 3]);
            });
          },
        );
      });
    });
  });
});
