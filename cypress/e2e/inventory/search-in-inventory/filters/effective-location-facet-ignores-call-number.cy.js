import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryNewInstance from '../../../../support/fragments/inventory/inventoryNewInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../../support/fragments/inventory/item/itemRecordEdit';
import Location from '../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { ITEM_STATUS_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(6);
      const titlePrefix = `AT_C466165_FolioInstance_${randomPostfix}`;
      const instanceTitles = {
        // Seeded with 1 item at testData.location in before(), so the facet option already
        // has a stable, exact counter of 1 before the real test steps run - this release
        // loads every location in the facet (no "+ More"), so we no longer need to hunt for
        // a "lowest counter" location as TestRail describes; a dedicated test-owned location
        // keeps the counter exact and immune to other tests'/parallel runs' data
        seed: `${titlePrefix}_Seed`,
        created: `${titlePrefix}_Created`,
      };
      const itemBarcode = `${titlePrefix}_ItemBarcode`;
      // Kept short and separate from titlePrefix - the item's Call number field silently
      // truncates long values, and titlePrefix already carries a long random postfix
      const callNumberValue = `AT_C466165_CN_${randomLetters}`;
      const locationsAccordionName = 'Effective location (item)';
      const testData = {};

      before('Create test data and user', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C466165_');

        cy.then(() => {
          testData.servicePoint = ServicePoints.getDefaultServicePoint();
          ServicePoints.createViaApi(testData.servicePoint);
          testData.location = Location.getDefaultLocation(
            testData.servicePoint.id,
            `atc466165${randomLetters}`,
            `atc466165${randomLetters}`,
          );
          Location.createViaApi(testData.location).then((location) => {
            testData.location.id = location.id;
          });

          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
            testData.holdingTypeId = holdingTypes[0].id;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            testData.loanTypeId = res[0].id;
            testData.loanTypeName = res[0].name;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            testData.materialTypeId = res.id;
            testData.materialTypeName = res.name;
          });
        }).then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              title: instanceTitles.seed,
              instanceTypeId: testData.instanceTypeId,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.location.id,
              },
            ],
            items: [
              {
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((createdInstance) => {
            testData.seedInstanceId = createdInstance.instanceId;
          });

          cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUser) => {
            testData.user = createdUser;
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Delete user, location, instances', () => {
        cy.getAdminToken(false);
        InventoryInstances.deleteFullInstancesByTitleViaApi(titlePrefix);
        Users.deleteViaApi(testData.user.userId);
        ServicePoints.deleteViaApi(testData.servicePoint.id);
        Location.deleteInstitutionCampusLibraryLocationViaApi(
          testData.location.institutionId,
          testData.location.campusId,
          testData.location.libraryId,
          testData.location.id,
        );
      });

      it(
        'C466165 "Effective location (item)" facet shows all locations regardless of item\'s "Effective call number" field during search in "Instance" tab (promin)',
        { tags: ['criticalPath', 'promin', 'C466165'] },
        () => {
          let searchAlias;

          // Step 1-2: expand "Effective location (item)" facet - this release loads every
          // location (no "+ More"), so instead of hunting for the lowest-counter location we
          // use our own dedicated test location, seeded with exactly 1 item in before()
          InventorySearchAndFilter.toggleAccordionByName(locationsAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(locationsAccordionName, true);
          InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
            locationsAccordionName,
            testData.location.name,
            true,
            1,
          );

          // Step 3: click the noted location - 1 result (the seed instance)
          searchAlias = InventorySearchAndFilter.interceptInstancesSearch();
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            locationsAccordionName,
            testData.location.name,
          );
          InventorySearchAndFilter.waitForInstancesSearchToLoad(searchAlias);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
            locationsAccordionName,
            testData.location.name,
            1,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.seed);

          // Step 4: Reset all
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();

          // Step 5: create a new Instance record via UI
          InventoryInstances.addNewInventory();
          InventoryNewInstance.fillRequiredValues(instanceTitles.created);
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 6: add Holdings with the noted location
          InventoryInstance.pressAddHoldingsButton();
          HoldingsRecordEdit.changePermanentLocation(testData.location.name);
          HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 7: add Item (no Call number)
          InventoryInstance.clickAddItemByHoldingName({
            holdingName: testData.location.name,
            instanceTitle: instanceTitles.created,
          });
          ItemRecordNew.fillItemRecordFields({
            barcode: itemBarcode,
            materialType: testData.materialTypeName,
            loanType: testData.loanTypeName,
          });
          ItemRecordNew.saveAndClose({ itemSaved: true });
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location.name, 1);
          InventorySearchAndFilter.closeInstanceDetailPane();

          // Step 8-9: same location now counts the seed + newly created instance (2) -
          // counter increased after the new Holdings/Item creation
          InventorySearchAndFilter.toggleAccordionByName(locationsAccordionName);
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
            testData.location.name,
          );
          InventorySearchAndFilter.waitForInstancesSearchToLoad(searchAlias);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
            locationsAccordionName,
            testData.location.name,
            2,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(2);
          InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.seed);
          InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.created);

          // Step 10: open the created Instance's detail view
          InventoryInstances.selectInstanceByTitle(instanceTitles.created);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 11: fill Call number on the Item created at step 7
          InventoryInstance.openHoldings(testData.location.name);
          InventoryInstance.openItemByBarcode(itemBarcode);
          ItemRecordView.openItemEditForm(instanceTitles.created);
          ItemRecordEdit.addCallNumberValue(callNumberValue);
          ItemRecordEdit.saveAndClose({ itemSaved: true });
          // Editing (unlike creating) an item lands on the fullscreen item view - close it
          // to get back to the instance view within the search pane
          ItemRecordView.closeDetailView();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 12: Reset all
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();

          // Step 13-14: same location still counts 2 - Call number update doesn't change it
          InventorySearchAndFilter.toggleAccordionByName(locationsAccordionName);
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
            testData.location.name,
          );
          InventorySearchAndFilter.waitForInstancesSearchToLoad(searchAlias);
          InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
            locationsAccordionName,
            testData.location.name,
            2,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(2);
          InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.seed);
          InventorySearchAndFilter.verifyInstanceDisplayed(instanceTitles.created);
        },
      );
    });
  });
});
