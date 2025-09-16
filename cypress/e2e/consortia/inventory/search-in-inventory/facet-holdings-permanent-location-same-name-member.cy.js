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
import { APPLICATION_NAMES } from '../../../../support/constants';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const titlePrefix = `AT_C494020_${randomPostfix}`;
        const testData = {
          locations: {},
          instances: {},
          user: {},
        };
        const instanceTitles = {
          shared1: `${titlePrefix}: Shared Instance 1`,
          shared2: `${titlePrefix}: Shared Instance 2`,
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
        const createdInstanceIds = {
          central: [],
        };
        const locationsAccordionName = 'Holdings permanent location';
        const Dropdowns = {
          HELDBY: 'Held by',
        };

        before('Create test data and user', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.then(() => {
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              testData.instanceTypeIdCentral = instanceTypes[0].id;
            });
            cy.setTenant(tenants.member1);
            cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
              testData.holdingTypeIdMember1 = holdingTypes[0].id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.holdingsSourceIdMember1 = folioSource.id;
            });
            cy.setTenant(tenants.member2);
            cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
              testData.holdingTypeIdMember2 = holdingTypes[0].id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.holdingsSourceIdMember2 = folioSource.id;
            });
            // Create locations in both member tenants
            cy.setTenant(tenants.member1);
            testData.servicePointMember1 = ServicePoints.getDefaultServicePoint();
            ServicePoints.createViaApi(testData.servicePointMember1);
            testData.locations.testLocation_member1 = Location.getDefaultLocation(
              testData.servicePointMember1.id,
              `${titlePrefix}_TestLocation`,
              `${titlePrefix}_T`,
            );
            Location.createViaApi(testData.locations.testLocation_member1).then((loc) => {
              testData.locations.testLocation_member1.id = loc.id;
            });
            cy.setTenant(tenants.member2);
            testData.servicePointMember2 = ServicePoints.getDefaultServicePoint();
            ServicePoints.createViaApi(testData.servicePointMember2);
            testData.locations.testLocation_member2 = Location.getDefaultLocation(
              testData.servicePointMember2.id,
              `${titlePrefix}_TestLocation`,
              `${titlePrefix}_T`,
            );
            Location.createViaApi(testData.locations.testLocation_member2).then((loc) => {
              testData.locations.testLocation_member2.id = loc.id;
            });
          }).then(() => {
            // Create shared instances in Central
            cy.setTenant(tenants.central);
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                title: instanceTitles.shared1,
                instanceTypeId: testData.instanceTypeIdCentral,
              },
            }).then((createdInstance) => {
              createdInstanceIds.central.push(createdInstance.instanceId);
              // Holdings in Member 1
              cy.setTenant(tenants.member1);
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: createdInstance.instanceId,
                permanentLocationId: testData.locations.testLocation_member1.id,
                sourceId: testData.holdingsSourceIdMember1,
              }).then((holding) => {
                createdHoldingsIds.member1.push(holding.id);
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
              // Holdings in Member 2
              cy.setTenant(tenants.member2);
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: createdInstance.instanceId,
                permanentLocationId: testData.locations.testLocation_member2.id,
                sourceId: testData.holdingsSourceIdMember2,
              }).then((holding) => {
                createdHoldingsIds.member2.push(holding.id);
              });
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
          createdHoldingsIds.member1.forEach((id) => {
            InventoryHoldings.deleteHoldingRecordViaApi(id);
          });
          Location.deleteInstitutionCampusLibraryLocationViaApi(
            testData.locations.testLocation_member1.institutionId,
            testData.locations.testLocation_member1.campusId,
            testData.locations.testLocation_member1.libraryId,
            testData.locations.testLocation_member1.id,
          );

          cy.setTenant(tenants.member2);
          ServicePoints.deleteViaApi(testData.servicePointMember2.id);
          createdHoldingsIds.member2.forEach((id) => {
            InventoryHoldings.deleteHoldingRecordViaApi(id);
          });
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
          'C494020 Locations with same names could be found using "Holdings permanent location" facet in "Inventory" app from "Member" tenant (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'C494020'] },
          () => {
            // Login and switch affiliation to Member 1
            cy.login(testData.user.username, testData.user.password);
            ConsortiumManager.switchActiveAffiliation(
              tenantDisplayNames.central,
              tenantDisplayNames.member1,
            );
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
            InventoryInstances.waitContentLoading();

            // Step 1: Expand "Holdings permanent location" dropdown
            InventorySearchAndFilter.clearDefaultFilter(Dropdowns.HELDBY);
            InventorySearchAndFilter.clickAccordionByName(locationsAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(locationsAccordionName, true);
            InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
              locationsAccordionName,
            );

            // Step 2: Type "Test location" in facet and verify both tenant options
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
            // Step 3: Select Member 1 location and verify result
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.locations.testLocation_member1.name} (${tenantDisplayNames.member1})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared1);
            // Step 4: Cancel and select Member 2 location
            InventorySearchAndFilter.clearFilter(locationsAccordionName);
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.locations.testLocation_member2.name} (${tenantDisplayNames.member2})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared2);
            // Step 5: Switch to Item tab, verify cleared
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            InventorySearchAndFilter.checkSearchQueryText('');
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.clearDefaultFilter(Dropdowns.HELDBY);
            // Step 6: Run search for both instances
            InventoryInstances.searchByTitle(titlePrefix);
            InventorySearchAndFilter.verifyNumberOfSearchResults(2);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared1);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared2);
            // Step 7: Expand "Holdings permanent location" dropdown again
            InventorySearchAndFilter.clickAccordionByName(locationsAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(locationsAccordionName, true);
            InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
              locationsAccordionName,
            );
            // Step 8: Type "Test location" in facet and verify both tenant options
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
            // Step 9: Select Member 1 location and verify result
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.locations.testLocation_member1.name} (${tenantDisplayNames.member1})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared1);
            // Step 10: Cancel and select Member 2 location
            InventorySearchAndFilter.clearFilter(locationsAccordionName);
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.locations.testLocation_member2.name} (${tenantDisplayNames.member2})`,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared2);
          },
        );
      });
    });
  });
});
