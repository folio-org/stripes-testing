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
import HoldingsRecordView, {
  actionsMenuOptions,
} from '../../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';

describe.skip('Inventory', () => {
  describe('Item', () => {
    describe('Re-order item records', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instanceTitle = `AT_C808509_FolioInstance_${randomPostfix}`;
        const itemIds = [];
        let user;
        let instanceId;
        let holdingsId;
        let holdingsHrid;
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

            // Set up Holdings A in Member 1 (College)
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
                holdingsId = holdings.id;
                holdingsHrid = holdings.hrid;

                // Create 3 items in Holdings A with order 1, 2, 3
                for (let i = 2; i <= 4; i++) {
                  cy.createItem({
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    holdingsRecordId: holdingsId,
                    materialType: { id: materialType.id },
                    permanentLoanType: { id: loanType.id },
                    order: i,
                  }).then(({ body }) => {
                    itemIds.push(body.id);
                  });
                }
              });
            });

            // Set up Holdings B in Member 2 (University)
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiInventoryViewCreateEditHoldings.gui,
              Permissions.uiInventoryViewCreateEditItems.gui,
              Permissions.uiInventoryUpdateOwnership.gui,
            ]);
            const locationBData = Locations.getDefaultLocation({
              servicePointId: ServicePoints.getDefaultServicePoint().id,
            }).location;
            Locations.createViaApi(locationBData).then((loc) => {
              locationB = loc;
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Clean up in Member 1 (College)
          cy.withinTenant(Affiliations.College, () => {
            itemIds.forEach((itemId) => {
              cy.deleteItemViaApi(itemId);
            });
            cy.deleteHoldingRecordViaApi(holdingsId);
            Locations.deleteViaApi(locationA);
          });
          // Clean up in Member 2 (University)
          cy.withinTenant(Affiliations.University, () => {
            itemIds.forEach((itemId) => {
              cy.deleteItemViaApi(itemId);
            });
            cy.deleteHoldingRecordViaApi(holdingsId);
            Locations.deleteViaApi(locationB);
          });
          // Clean up in Central
          cy.resetTenant();
          InventoryInstance.deleteInstanceViaApi(instanceId);
          Users.deleteViaApi(user.userId);
        });

        // Trillium+ only
        it(
          'C808509 Update ownership of "Holdings" record and check Item\'s "order" fields (spitfire)',
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

            // Step 1: Move holdings to Member 2
            InventoryInstance.openHoldingView();
            HoldingsRecordView.checkHoldingRecordViewOpened();
            HoldingsRecordView.validateOptionInActionsMenu([
              { optionName: actionsMenuOptions.updateOwnership, shouldExist: true },
            ]);
            HoldingsRecordView.updateOwnership(
              tenantNames.university,
              'confirm',
              holdingsHrid,
              tenantNames.college,
              locationB.name,
            );

            InstanceRecordView.waitLoading();
            InstanceRecordView.verifyConsortiaHoldingsAccordion(false);
            InstanceRecordView.expandConsortiaHoldings();
            InstanceRecordView.verifyMemberSubHoldingsAccordion(Affiliations.University);
            InstanceRecordView.expandMemberSubHoldings(tenantNames.university);
            InstanceRecordView.verifyIsHoldingsCreated([`${locationB.name} >`]);

            // Step 3: Check the order field
            cy.setTenant(Affiliations.University);
            InventoryItems.getItemsInHoldingsViaApi(holdingsId).then((itemsInHoldings) => {
              const orderSequence = itemsInHoldings.map((item) => item.order);
              cy.wrap(orderSequence).should('deep.equal', [2, 3, 4]);
            });
          },
        );
      });
    });
  });
});
