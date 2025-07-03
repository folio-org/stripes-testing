import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const titlePrefix = `AT_C491303_${randomPostfix}`;
        const testData = {
          locations: {},
          instances: {},
          user: {},
        };
        const instanceTitles = {
          shared1: `${titlePrefix}: Shared Instance 1, Location A (unique), Member 1`,
          shared2: `${titlePrefix}: Shared Instance 2, Location B (unique), Member 2`,
          shared3: `${titlePrefix}: Shared Instance 3, Location C (same name), Member 1`,
          shared4: `${titlePrefix}: Shared Instance 4, Location C (same name), Member 2`,
          local5: `${titlePrefix}: Local Instance 5, Location A (unique), Member 1`,
          local6: `${titlePrefix}: Local Instance 6, Location B (unique), Member 2`,
          local7: `${titlePrefix}: Local Instance 7, Location C (same name), Member 1`,
          local8: `${titlePrefix}: Local Instance 8, Location C (same name), Member 2`,
        };
        const tenants = {
          central: Affiliations.Consortia,
          member1: Affiliations.College,
          member2: Affiliations.University,
        };
        const tenantDisplayNames = {
          central: tenantNames.central,
          member1: tenantNames.college,
          member2: tenantNames.university,
        };
        const createdHoldingsIds = {
          member1: [],
          member2: [],
        };
        const createdItemIds = {
          member1: [],
          member2: [],
        };
        const createdInstanceIds = {
          central: [],
          member1: [],
          member2: [],
        };
        const locationsAccordionName = 'Effective location (item)';

        before('Create test data and user', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.then(() => {
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              testData.instanceTypeIdCentral = instanceTypes[0].id;
            });
            cy.setTenant(tenants.member1);
            // Get required types from API
            cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
              testData.holdingTypeIdMember1 = holdingTypes[0].id;
            });
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              testData.instanceTypeIdMember1 = instanceTypes[0].id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.holdingsSourceIdMember1 = folioSource.id;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
              testData.loanTypeIdMember1 = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              testData.materialTypeIdMember1 = res.id;
            });
            cy.setTenant(tenants.member2);
            cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
              testData.holdingTypeIdMember2 = holdingTypes[0].id;
            });
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              testData.instanceTypeIdMember2 = instanceTypes[0].id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.holdingsSourceIdMember2 = folioSource.id;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
              testData.loanTypeIdMember2 = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              testData.materialTypeIdMember2 = res.id;
            });
            // Create locations in both member tenants
            // Location A (unique, Member 1)
            cy.setTenant(tenants.member1);
            testData.servicePointMember1 = ServicePoints.getDefaultServicePoint();
            ServicePoints.createViaApi(testData.servicePointMember1);
            testData.locations.locationA_member1 = Location.getDefaultLocation(
              testData.servicePointMember1.id,
              `${titlePrefix}_LocationA`,
              `${titlePrefix}_A`,
            );
            Location.createViaApi(testData.locations.locationA_member1).then((loc) => {
              testData.locations.locationA_member1.id = loc.id;
            });
            // Location B (unique, Member 2)
            cy.setTenant(tenants.member2);
            testData.servicePointMember2 = ServicePoints.getDefaultServicePoint();
            ServicePoints.createViaApi(testData.servicePointMember2);
            testData.locations.locationB_member2 = Location.getDefaultLocation(
              testData.servicePointMember2.id,
              `${titlePrefix}_LocationB`,
              `${titlePrefix}_B`,
            );
            Location.createViaApi(testData.locations.locationB_member2).then((loc) => {
              testData.locations.locationB_member2.id = loc.id;
            });
            // Test location (same name, both members)
            cy.setTenant(tenants.member1);
            testData.locations.testLocation_member1 = Location.getDefaultLocation(
              testData.servicePointMember1.id,
              `${titlePrefix}_TestLocation`,
              `${titlePrefix}_T`,
            );
            Location.createViaApi(testData.locations.testLocation_member1).then((loc) => {
              testData.locations.testLocation_member1.id = loc.id;
            });
            cy.setTenant(tenants.member2);
            testData.locations.testLocation_member2 = Location.getDefaultLocation(
              testData.servicePointMember2.id,
              `${titlePrefix}_TestLocation`,
              `${titlePrefix}_T`,
            );
            Location.createViaApi(testData.locations.testLocation_member2).then((loc) => {
              testData.locations.testLocation_member2.id = loc.id;
            });
          }).then(() => {
            // Create instances and holdings
            // Central
            cy.setTenant(tenants.central);
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                title: instanceTitles.shared1,
                instanceTypeId: testData.instanceTypeIdCentral,
              },
            }).then((createdInstance) => {
              createdInstanceIds.central.push(createdInstance.instanceId);
              cy.setTenant(tenants.member1);
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: createdInstance.instanceId,
                permanentLocationId: testData.locations.locationA_member1.id,
                sourceId: testData.holdingsSourceIdMember1,
              }).then((holding) => {
                createdHoldingsIds.member1.push(holding.id);
                InventoryItems.createItemViaApi({
                  holdingsRecordId: holding.id,
                  materialType: { id: testData.materialTypeIdMember1 },
                  permanentLoanType: { id: testData.loanTypeIdMember1 },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  createdItemIds.member1.push(item.id);
                });
              });
            });
            cy.setTenant(tenants.central);
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                title: instanceTitles.shared2,
                instanceTypeId: testData.instanceTypeIdCentral,
              },
            }).then((createdInstance) => {
              createdInstanceIds.central.push(createdInstance.instanceId);
              cy.setTenant(tenants.member2);
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: createdInstance.instanceId,
                permanentLocationId: testData.locations.locationB_member2.id,
                sourceId: testData.holdingsSourceIdMember2,
              }).then((holding) => {
                createdHoldingsIds.member2.push(holding.id);
                InventoryItems.createItemViaApi({
                  holdingsRecordId: holding.id,
                  materialType: { id: testData.materialTypeIdMember2 },
                  permanentLoanType: { id: testData.loanTypeIdMember2 },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  createdItemIds.member2.push(item.id);
                });
              });
            });
            cy.setTenant(tenants.central);
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                title: instanceTitles.shared3,
                instanceTypeId: testData.instanceTypeIdCentral,
              },
            }).then((createdInstance) => {
              createdInstanceIds.central.push(createdInstance.instanceId);
              cy.setTenant(tenants.member1);
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: createdInstance.instanceId,
                permanentLocationId: testData.locations.testLocation_member1.id,
                sourceId: testData.holdingsSourceIdMember1,
              }).then((holding) => {
                createdHoldingsIds.member1.push(holding.id);
                InventoryItems.createItemViaApi({
                  holdingsRecordId: holding.id,
                  materialType: { id: testData.materialTypeIdMember1 },
                  permanentLoanType: { id: testData.loanTypeIdMember1 },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  createdItemIds.member1.push(item.id);
                });
              });
            });
            cy.setTenant(tenants.central);
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                title: instanceTitles.shared4,
                instanceTypeId: testData.instanceTypeIdCentral,
              },
            }).then((createdInstance) => {
              createdInstanceIds.central.push(createdInstance.instanceId);
              cy.setTenant(tenants.member2);
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: createdInstance.instanceId,
                permanentLocationId: testData.locations.testLocation_member2.id,
                sourceId: testData.holdingsSourceIdMember2,
              }).then((holding) => {
                createdHoldingsIds.member2.push(holding.id);
                InventoryItems.createItemViaApi({
                  holdingsRecordId: holding.id,
                  materialType: { id: testData.materialTypeIdMember2 },
                  permanentLoanType: { id: testData.loanTypeIdMember2 },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  createdItemIds.member2.push(item.id);
                });
              });
            });
            // Member 1
            cy.setTenant(tenants.member1);
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                title: instanceTitles.local5,
                instanceTypeId: testData.instanceTypeIdMember1,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeIdMember1,
                  permanentLocationId: testData.locations.locationA_member1.id,
                },
              ],
              items: [
                {
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeIdMember1 },
                  materialType: { id: testData.materialTypeIdMember1 },
                },
              ],
            }).then((createdInstance) => {
              createdInstanceIds.member1.push(createdInstance.instanceId);
              createdHoldingsIds.member1.push(createdInstance.holdings[0].id);
              createdItemIds.member1.push(createdInstance.items[0].id);
            });
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                title: instanceTitles.local7,
                instanceTypeId: testData.instanceTypeIdMember1,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeIdMember1,
                  permanentLocationId: testData.locations.testLocation_member1.id,
                },
              ],
              items: [
                {
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeIdMember1 },
                  materialType: { id: testData.materialTypeIdMember1 },
                },
              ],
            }).then((createdInstance) => {
              createdInstanceIds.member1.push(createdInstance.instanceId);
              createdHoldingsIds.member1.push(createdInstance.holdings[0].id);
              createdItemIds.member1.push(createdInstance.items[0].id);
            });
            // Member 2
            cy.setTenant(tenants.member2);
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                title: instanceTitles.local6,
                instanceTypeId: testData.instanceTypeIdMember2,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeIdMember2,
                  permanentLocationId: testData.locations.locationB_member2.id,
                },
              ],
              items: [
                {
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeIdMember2 },
                  materialType: { id: testData.materialTypeIdMember2 },
                },
              ],
            }).then((createdInstance) => {
              createdInstanceIds.member2.push(createdInstance.instanceId);
              createdHoldingsIds.member2.push(createdInstance.holdings[0].id);
              createdItemIds.member2.push(createdInstance.items[0].id);
            });
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                title: instanceTitles.local8,
                instanceTypeId: testData.instanceTypeIdMember2,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeIdMember2,
                  permanentLocationId: testData.locations.testLocation_member2.id,
                },
              ],
              items: [
                {
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeIdMember2 },
                  materialType: { id: testData.materialTypeIdMember2 },
                },
              ],
            }).then((createdInstance) => {
              createdInstanceIds.member2.push(createdInstance.instanceId);
              createdHoldingsIds.member2.push(createdInstance.holdings[0].id);
              createdItemIds.member2.push(createdInstance.items[0].id);
            });

            // Create and affiliate user
            cy.resetTenant();
            cy.getAdminToken();
            cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProps) => {
              testData.user = userProps;
              cy.getAdminToken(tenants.central).then(() => {
                cy.affiliateUserToTenant({
                  tenantId: tenants.member1,
                  userId: testData.user.userId,
                  permissions: [Permissions.uiInventoryViewInstances.gui],
                });
                cy.affiliateUserToTenant({
                  tenantId: tenants.member2,
                  userId: testData.user.userId,
                  permissions: [Permissions.uiInventoryViewInstances.gui],
                });
              });
            });
          });
        });

        after('Cleanup test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);

          cy.setTenant(tenants.member1);
          ServicePoints.deleteViaApi(testData.servicePointMember1.id);
          createdItemIds.member1.forEach((id) => {
            InventoryItems.deleteItemViaApi(id);
          });
          createdHoldingsIds.member1.forEach((id) => {
            InventoryHoldings.deleteHoldingRecordViaApi(id);
          });
          createdInstanceIds.member1.forEach((id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
          Location.deleteInstitutionCampusLibraryLocationViaApi(
            testData.locations.locationA_member1.institutionId,
            testData.locations.locationA_member1.campusId,
            testData.locations.locationA_member1.libraryId,
            testData.locations.locationA_member1.id,
          );
          Location.deleteInstitutionCampusLibraryLocationViaApi(
            testData.locations.testLocation_member1.institutionId,
            testData.locations.testLocation_member1.campusId,
            testData.locations.testLocation_member1.libraryId,
            testData.locations.testLocation_member1.id,
          );

          cy.setTenant(tenants.member2);
          ServicePoints.deleteViaApi(testData.servicePointMember2.id);
          createdItemIds.member2.forEach((id) => {
            InventoryItems.deleteItemViaApi(id);
          });
          createdHoldingsIds.member2.forEach((id) => {
            InventoryHoldings.deleteHoldingRecordViaApi(id);
          });
          createdInstanceIds.member2.forEach((id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
          Location.deleteInstitutionCampusLibraryLocationViaApi(
            testData.locations.locationB_member2.institutionId,
            testData.locations.locationB_member2.campusId,
            testData.locations.locationB_member2.libraryId,
            testData.locations.locationB_member2.id,
          );
          Location.deleteInstitutionCampusLibraryLocationViaApi(
            testData.locations.testLocation_member2.institutionId,
            testData.locations.testLocation_member2.campusId,
            testData.locations.testLocation_member2.libraryId,
            testData.locations.testLocation_member2.id,
          );

          cy.resetTenant();
          createdInstanceIds.central.forEach((id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C491303 Verify Tenant name displays next to location in "Effective location" facet during searching in Member tenant (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C491303'] },
          () => {
            // Login and switch affiliation to Member 1
            cy.waitForAuthRefresh(() => {
              cy.login(testData.user.username, testData.user.password);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventoryInstances.waitContentLoading();
              ConsortiumManager.switchActiveAffiliation(
                tenantDisplayNames.central,
                tenantDisplayNames.member1,
              );
              InventoryInstances.waitContentLoading();
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);

            // Step 1: Expand "Effective location (item)" dropdown
            InventorySearchAndFilter.clickAccordionByName(locationsAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(locationsAccordionName, true);
            InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
              locationsAccordionName,
            );

            // Step 2: Search for created instances
            InventoryInstances.searchByTitle(titlePrefix);
            // Step 3: Type "Test location" in facet and verify both tenant options
            InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
              locationsAccordionName,
              testData.locations.testLocation_member1.name,
              true,
              2,
            );
            InventorySearchAndFilter.verifyOptionAvailableMultiselect(
              locationsAccordionName,
              `${testData.locations.testLocation_member1.name} (${tenantDisplayNames.member1})`,
            );
            InventorySearchAndFilter.verifyOptionAvailableMultiselect(
              locationsAccordionName,
              `${testData.locations.testLocation_member2.name} (${tenantDisplayNames.member2})`,
            );
            // Step 4: Select Member 1 location and verify result
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.locations.testLocation_member1.name} (${tenantDisplayNames.member1})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(2);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared3);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.local7);
            // Step 5: Cancel and select Member 2 location
            InventorySearchAndFilter.clearFilter(locationsAccordionName);
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.locations.testLocation_member2.name} (${tenantDisplayNames.member2})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared4);
            // Step 6: Cancel and select Location A (unique)
            InventorySearchAndFilter.clearFilter(locationsAccordionName);
            InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
              locationsAccordionName,
              testData.locations.locationA_member1.name,
              true,
              1,
            );
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.locations.locationA_member1.name} (${tenantDisplayNames.member1})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(2);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared1);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.local5);
            // Step 7: Switch to Holdings tab, verify cleared
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
            InventorySearchAndFilter.checkSearchQueryText('');
            InventoryInstances.waitContentLoading();
            // Step 8: Expand "Effective location (item)" dropdown again
            InventorySearchAndFilter.clickAccordionByName(locationsAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(locationsAccordionName, true);
            InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
              locationsAccordionName,
            );
            // Step 9: Search again
            InventoryInstances.searchByTitle(titlePrefix);
            // Step 10: Type "Test location" in facet and verify both tenant options
            InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
              locationsAccordionName,
              testData.locations.testLocation_member1.name,
              true,
              2,
            );
            InventorySearchAndFilter.verifyOptionAvailableMultiselect(
              locationsAccordionName,
              `${testData.locations.testLocation_member1.name} (${tenantDisplayNames.member1})`,
            );
            InventorySearchAndFilter.verifyOptionAvailableMultiselect(
              locationsAccordionName,
              `${testData.locations.testLocation_member2.name} (${tenantDisplayNames.member2})`,
            );
            // Step 11: Click on found "Test location (College)"
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.locations.testLocation_member1.name} (${tenantDisplayNames.member1})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(2);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared3);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.local7);
            // Step 12: Cancel and select Location B (unique, Member 2)
            InventorySearchAndFilter.clearFilter(locationsAccordionName);
            InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
              locationsAccordionName,
              testData.locations.locationB_member2.name,
              true,
              1,
            );
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.locations.locationB_member2.name} (${tenantDisplayNames.member2})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared2);
            // Step 13: Switch to Item tab, verify cleared
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            InventorySearchAndFilter.checkSearchQueryText('');
            InventoryInstances.waitContentLoading();
            // Step 14: Type "Test location" in facet and verify both tenant options
            InventorySearchAndFilter.clickAccordionByName(locationsAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(locationsAccordionName, true);
            InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
              locationsAccordionName,
              testData.locations.testLocation_member1.name,
              true,
              2,
            );
            InventorySearchAndFilter.verifyOptionAvailableMultiselect(
              locationsAccordionName,
              `${testData.locations.testLocation_member1.name} (${tenantDisplayNames.member1})`,
            );
            InventorySearchAndFilter.verifyOptionAvailableMultiselect(
              locationsAccordionName,
              `${testData.locations.testLocation_member2.name} (${tenantDisplayNames.member2})`,
            );
            // Step 15: Click on found "Test location (College)"
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.locations.testLocation_member1.name} (${tenantDisplayNames.member1})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(2);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared3);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.local7);
            // Step 16: Select also "<Location A name> (College)" and "Test location (Member 2)"
            InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
              locationsAccordionName,
              testData.locations.locationA_member1.name,
              true,
              1,
            );
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.locations.locationA_member1.name} (${tenantDisplayNames.member1})`,
            );
            InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
              locationsAccordionName,
              testData.locations.testLocation_member2.name,
              true,
              2,
            );
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.locations.testLocation_member2.name} (${tenantDisplayNames.member2})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(5);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared1);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared3);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared4);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.local5);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.local7);
          },
        );
      });
    });
  });
});
