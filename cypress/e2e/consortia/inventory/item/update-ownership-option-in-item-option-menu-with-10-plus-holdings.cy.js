import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView, {
  actionsMenuOptions,
} from '../../../../support/fragments/inventory/item/itemRecordView';
import UpdateOwnershipModal from '../../../../support/fragments/inventory/modals/updateOwnershipModal';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    describe('Consortia', () => {
      const instanceTitle = `AT_C1301733_Instance_${getRandomPostfix()}`;
      const testData = {
        user: {},
        collegeTenant: {
          targetLocationName: '',
          instance: {},
          item: { barcode: uuid() },
        },
        universityTenant: {
          locationName: '',
        },
      };
      const capabilitySets = [
        CapabilitySets.uiInventory,
        CapabilitySets.uiConsortiaInventoryUpdateOwnershipItem,
      ];
      const fillerHoldingsCount = 10;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;
        });

        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi('C1301733_');
        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteFullInstancesByTitleViaApi('C1301733_');
        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C1301733_');

        cy.setTenant(Affiliations.College).then(() => {
          InventoryInstance.createInstanceViaApi({ instanceTitle })
            .then(({ instanceData }) => {
              testData.collegeTenant.instance = instanceData;

              // Index 2 keeps the filler location distinct from the target one, so
              // InstanceRecordView.openHoldingItem can unambiguously locate the right accordion
              // among the 11 holdings by location name
              Locations.getOrCreateTenantLocationViaApi(Affiliations.College, 1).then(
                (location) => {
                  testData.collegeTenant.targetLocationName = location.name;
                  testData.collegeTenant.targetLocationId = location.id;
                },
              );
              Locations.getOrCreateTenantLocationViaApi(Affiliations.College, 2).then(
                (location) => {
                  testData.collegeTenant.fillerLocationId = location.id;
                },
              );
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                testData.collegeTenant.sourceId = folioSource.id;
              });
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
                testData.collegeTenant.item.loanTypeId = res[0].id;
              });
              cy.getMaterialTypes({ limit: 1, query: 'source<>local' }).then((res) => {
                testData.collegeTenant.item.materialTypeId = res.id;
              });
            })
            .then(() => {
              // Target holdings - carries the single item the test moves to Member-2
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.collegeTenant.instance.instanceId,
                permanentLocationId: testData.collegeTenant.targetLocationId,
                sourceId: testData.collegeTenant.sourceId,
              }).then((holding) => {
                InventoryItems.createItemViaApi({
                  barcode: testData.collegeTenant.item.barcode,
                  holdingsRecordId: holding.id,
                  materialType: { id: testData.collegeTenant.item.materialTypeId },
                  permanentLoanType: { id: testData.collegeTenant.item.loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  testData.collegeTenant.item = item;
                });
              });

              // Filler holdings - pad the Instance to 11+ Holdings for the test's scale scenario
              Cypress._.times(fillerHoldingsCount, () => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: testData.collegeTenant.instance.instanceId,
                  permanentLocationId: testData.collegeTenant.fillerLocationId,
                  sourceId: testData.collegeTenant.sourceId,
                });
              });

              InventoryInstance.shareInstanceViaApi(
                testData.collegeTenant.instance.instanceId,
                testData.consortiaId,
                Affiliations.College,
                Affiliations.Consortia,
              );
            });
        });

        cy.setTenant(Affiliations.University);
        Locations.getOrCreateTenantLocationViaApi(Affiliations.University, 1).then((location) => {
          testData.universityTenant.locationName = location.name;
        });
        cy.resetTenant();
        cy.getAdminToken();
        // Created directly in College - its primary affiliation - so the user logs straight into
        // Member-1 per the precondition, with no affiliation switch needed afterward
        cy.setTenant(Affiliations.College);
        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabilitySets);

          // Central affiliation is automatic regardless of creation tenant - only the capability
          // grant is needed there
          cy.resetTenant();
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabilitySets);

          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabilitySets);
          cy.resetTenant();

          cy.setTenant(Affiliations.College);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.collegeTenant.instance.instanceId);
          InventoryInstances.selectInstanceById(testData.collegeTenant.instance.instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);

        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
      });

      it(
        'C1301733 Check "Update ownership" option in Item option menu when there\'s 10+ Holdings (consortia) (promin)',
        { tags: ['extendedPathECS', 'promin', 'C1301733'] },
        () => {
          // Steps 1-2: expand Holdings accordion, open the item's detail view
          InstanceRecordView.openHoldingItem({
            name: testData.collegeTenant.targetLocationName,
            barcode: testData.collegeTenant.item.barcode,
          });

          // Step 3: "Update ownership" option is present in the Actions menu
          ItemRecordView.validateOptionInActionsMenu([
            { optionName: actionsMenuOptions.updateOwnership, shouldExist: true },
          ]);

          // Steps 4-7: select Member-2 affiliation, create new holdings at a location, confirm -
          // item moves from Member-1 to the new Member-2 holding
          ItemRecordView.clickUpdateOwnership();
          UpdateOwnershipModal.updateHoldingsWithNewLocation(
            tenantNames.university,
            testData.universityTenant.locationName,
          );
          ItemRecordView.verifyOwnershipUpdatedCallout(testData.collegeTenant.item.hrid);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InstanceRecordView.verifyItemsCount(0, testData.collegeTenant.targetLocationName);
          InstanceRecordView.expandConsortiaHoldings();
          InstanceRecordView.expandMemberSubHoldings(tenantNames.university);
          InstanceRecordView.verifyItemsCount(1, testData.universityTenant.locationName);

          // Step 8: switch to Member-2, open the shared instance
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          InventoryInstances.searchByTitle(testData.collegeTenant.instance.instanceId);
          InventoryInstances.selectInstanceById(testData.collegeTenant.instance.instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 9: expand Holdings, open the moved item - detail view displayed in Member-2
          InstanceRecordView.openHoldingItem({
            name: testData.universityTenant.locationName,
            barcode: testData.collegeTenant.item.barcode,
          });
          ItemRecordView.verifyItemBarcode(testData.collegeTenant.item.barcode);
        },
      );
    });
  });
});
