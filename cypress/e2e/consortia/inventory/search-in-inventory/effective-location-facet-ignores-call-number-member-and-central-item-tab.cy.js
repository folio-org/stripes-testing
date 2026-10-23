import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../../support/fragments/inventory/item/itemRecordEdit';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(6);
        const titlePrefix = `AT_C466202_FolioInstance_${randomPostfix}`;
        const instanceTitles = {
          shared: `${titlePrefix}_Shared`,
          local: `${titlePrefix}_Local`,
          // Local-only, seeded with 1 item at testData.location in before() so the facet
          // option already has a stable, exact counter of 1 before the real test steps run -
          // this release loads every location in the facet (no "+ More"), so we no longer
          // need to hunt for a "lowest counter" location as TestRail describes; a dedicated
          // test-owned location keeps the counters exact and immune to other tests'/parallel
          // runs' data
          seedLocal: `${titlePrefix}_SeedLocal`,
        };
        const sharedItemBarcode = `${titlePrefix}_SharedItemBarcode`;
        const localItemBarcode = `${titlePrefix}_LocalItemBarcode`;
        const callNumberValue = `${titlePrefix}_CallNumber`;
        const locationsAccordionName = 'Effective location (item)';
        const testData = {};

        before('Create test data and user', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteFullInstancesByTitleViaApi('C466202_');
          cy.resetTenant();
          InventoryInstances.deleteFullInstancesByTitleViaApi('C466202_');

          cy.then(() => {
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              testData.instanceTypeIdCentral = instanceTypes[0].id;
            });

            cy.setTenant(Affiliations.College);
            testData.servicePoint = ServicePoints.getDefaultServicePoint();
            ServicePoints.createViaApi(testData.servicePoint);
            testData.location = Location.getDefaultLocation(
              testData.servicePoint.id,
              `atc466202${randomLetters}`,
              `atc466202${randomLetters}`,
            );
            Location.createViaApi(testData.location).then((location) => {
              testData.location.id = location.id;
            });

            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              testData.instanceTypeIdMember = instanceTypes[0].id;
            });
            cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
              testData.holdingTypeIdMember = holdingTypes[0].id;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              testData.holdingsSourceIdMember = folioSource.id;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
              testData.loanTypeIdMember = res[0].id;
              testData.loanTypeNameMember = res[0].name;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              testData.materialTypeIdMember = res.id;
              testData.materialTypeNameMember = res.name;
            });
          })
            .then(() => {
              cy.setTenant(Affiliations.College);
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  title: instanceTitles.seedLocal,
                  instanceTypeId: testData.instanceTypeIdMember,
                },
                holdings: [
                  {
                    holdingsTypeId: testData.holdingTypeIdMember,
                    permanentLocationId: testData.location.id,
                  },
                ],
                items: [
                  {
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    permanentLoanType: { id: testData.loanTypeIdMember },
                    materialType: { id: testData.materialTypeIdMember },
                  },
                ],
              }).then((createdInstance) => {
                testData.seedInstanceId = createdInstance.instanceId;
              });

              // Shared instance (Central) and Local instance (Member), per preconditions -
              // created WITHOUT holdings/items yet; those are added via UI in the test itself
              cy.setTenant(Affiliations.Consortia);
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  title: instanceTitles.shared,
                  instanceTypeId: testData.instanceTypeIdCentral,
                },
              }).then((createdInstance) => {
                testData.sharedInstanceId = createdInstance.instanceId;
              });

              cy.setTenant(Affiliations.College);
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  title: instanceTitles.local,
                  instanceTypeId: testData.instanceTypeIdMember,
                },
              }).then((createdInstance) => {
                testData.localInstanceId = createdInstance.instanceId;
              });

              // User created in College (member) so it logs in there directly (ECS skill Pattern 1)
              cy.setTenant(Affiliations.College);
              cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUser) => {
                testData.user = createdUser;

                cy.resetTenant();
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.inventoryAll.gui,
                ]);
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              InventorySearchAndFilter.switchToItem();
              InventorySearchAndFilter.itemTabIsDefault();
            });
        });

        after('Delete user, location, instances', () => {
          cy.resetTenant();
          cy.getAdminToken(false);
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteFullInstancesByTitleViaApi(titlePrefix);
          ServicePoints.deleteViaApi(testData.servicePoint.id);

          cy.resetTenant();
          Users.deleteViaApi(testData.user.userId);
          InventoryInstances.deleteFullInstancesByTitleViaApi(titlePrefix);

          cy.setTenant(Affiliations.College);
          Location.deleteInstitutionCampusLibraryLocationViaApi(
            testData.location.institutionId,
            testData.location.campusId,
            testData.location.libraryId,
            testData.location.id,
          );
        });

        it(
          'C466202 "Effective location (item)" facet shows all locations regardless of item\'s "Effective call number" field during search in "Item" tab from Member and Central tenant (consortia) (promin)',
          { tags: ['criticalPathECS', 'promin', 'C466202'] },
          () => {
            let searchAlias;

            // Step 1: unselect current member tenant in "Held by" facet
            InventorySearchAndFilter.clearDefaultHeldbyFilter();

            // Step 2-4: expand "Effective location (item)" facet - this release loads every
            // location (no "+ More"), so instead of hunting for the lowest-counter location we
            // use our own dedicated test location, seeded with exactly 1 item in before()
            InventorySearchAndFilter.clickAccordionByName(locationsAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(locationsAccordionName, true);
            InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
              locationsAccordionName,
              testData.location.name,
              true,
              1,
            );
            searchAlias = InventorySearchAndFilter.interceptInstancesSearch();
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.location.name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.waitForInstancesSearchToLoad(searchAlias);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              locationsAccordionName,
              `${testData.location.name} (${tenantNames.college})`,
              1,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.seedLocal);

            // Step 5: Reset all
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.clearDefaultHeldbyFilter();

            // Step 6: find created Shared and Local instances - the seed instance also
            // matches titlePrefix and already exists at this point, so 3
            searchAlias = InventorySearchAndFilter.interceptInstancesSearch();
            InventoryInstances.searchByTitle(titlePrefix);
            InventorySearchAndFilter.waitForInstancesSearchToLoad(searchAlias);
            InventorySearchAndFilter.verifyNumberOfSearchResults(3);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.local);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.seedLocal);

            // Step 7-8: add Holdings (test location) + Item (no Call number) to Shared instance
            InventoryInstances.selectInstanceById(testData.sharedInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.pressAddHoldingsButton();
            HoldingsRecordEdit.changePermanentLocation(testData.location.name);
            HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.clickAddItemByHoldingName({
              holdingName: testData.location.name,
              instanceTitle: instanceTitles.shared,
            });
            ItemRecordNew.fillItemRecordFields({
              barcode: sharedItemBarcode,
              materialType: testData.materialTypeNameMember,
              loanType: testData.loanTypeNameMember,
            });
            ItemRecordNew.saveAndClose({ itemSaved: true });
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location.name, 1);
            InventorySearchAndFilter.closeInstanceDetailPane();

            // Step 9-10: add Holdings (test location) + Item (no Call number) to Local instance
            InventoryInstances.selectInstanceById(testData.localInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.pressAddHoldingsButton();
            HoldingsRecordEdit.changePermanentLocation(testData.location.name);
            HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.clickAddItemByHoldingName({
              holdingName: testData.location.name,
              instanceTitle: instanceTitles.local,
            });
            ItemRecordNew.fillItemRecordFields({
              barcode: localItemBarcode,
              materialType: testData.materialTypeNameMember,
              loanType: testData.loanTypeNameMember,
            });
            ItemRecordNew.saveAndClose({ itemSaved: true });
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location.name, 1);
            InventorySearchAndFilter.verifyNumberOfSearchResults(3);
            InventorySearchAndFilter.closeInstanceDetailPane();

            // Step 11-12: same location now counts the seed + Shared + Local instances (3) -
            // counter increased after the new Holdings/Item creation
            InventorySearchAndFilter.clickAccordionByName(locationsAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(locationsAccordionName, true);
            InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
              locationsAccordionName,
              testData.location.name,
              true,
              1,
            );
            searchAlias = InventorySearchAndFilter.interceptInstancesSearch();
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.location.name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.waitForInstancesSearchToLoad(searchAlias);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              locationsAccordionName,
              `${testData.location.name} (${tenantNames.college})`,
              3,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(3);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.local);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.seedLocal);

            // Step 13: fill Call number on Shared instance's item
            InventoryInstances.selectInstanceById(testData.sharedInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.openHoldings(testData.location.name);
            InventoryInstance.openItemByBarcode(sharedItemBarcode);
            ItemRecordView.openItemEditForm(instanceTitles.shared);
            ItemRecordEdit.addCallNumberValue(callNumberValue);
            ItemRecordEdit.saveAndClose({ itemSaved: true });
            // Editing (unlike creating) an item lands on the fullscreen item view - close it
            // to get back to the instance view within the search pane
            ItemRecordView.closeDetailView();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 14: fill Call number on Local instance's item
            InventoryInstances.selectInstanceById(testData.localInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();
            InventoryInstance.openHoldings(testData.location.name);
            InventoryInstance.openItemByBarcode(localItemBarcode);
            ItemRecordView.openItemEditForm(instanceTitles.local);
            ItemRecordEdit.addCallNumberValue(callNumberValue);
            ItemRecordEdit.saveAndClose({ itemSaved: true });
            // Editing (unlike creating) an item lands on the fullscreen item view - close it
            // to get back to the instance view within the search pane
            ItemRecordView.closeDetailView();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 15: Reset all
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.clearDefaultHeldbyFilter();

            // Step 16-17: same location still counts 3 - Call number update doesn't change it
            InventorySearchAndFilter.clickAccordionByName(locationsAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(locationsAccordionName, true);
            InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
              locationsAccordionName,
              testData.location.name,
              true,
              1,
            );
            searchAlias = InventorySearchAndFilter.interceptInstancesSearch();
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.location.name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.waitForInstancesSearchToLoad(searchAlias);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              locationsAccordionName,
              `${testData.location.name} (${tenantNames.college})`,
              3,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(3);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.local);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.seedLocal);

            // Step 18: switch active affiliation to Central tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            InventoryInstances.waitContentLoading();

            // Step 19-20: select "Item" tab again (affiliation switch resets it to Instance),
            // then only the Shared instance counts for this location (Local and seed
            // instances are Member-only and never visible from Central)
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            InventorySearchAndFilter.clickAccordionByName(locationsAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(locationsAccordionName, true);
            InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
              locationsAccordionName,
              testData.location.name,
              true,
              1,
            );
            searchAlias = InventorySearchAndFilter.interceptInstancesSearch();
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              locationsAccordionName,
              `${testData.location.name} (${tenantNames.college})`,
            );
            InventorySearchAndFilter.waitForInstancesSearchToLoad(searchAlias);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              locationsAccordionName,
              `${testData.location.name} (${tenantNames.college})`,
              1,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.shared);
          },
        );
      });
    });
  });
});
