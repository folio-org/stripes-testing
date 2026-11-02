import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import { ITEM_STATUS_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(6);
    const titlePrefix = `AT_C466178_FolioInstance_${randomPostfix}`;
    const instanceTitles = {
      // Seeded with 1 item that HAS a call number at testData.location in before() - this
      // gives the "Call numbers (all)" browse row, and the Effective location (item) facet
      // option, a stable, exact baseline counter of 1 before the real test steps run
      seed: `${titlePrefix}_Seed`,
      created: `${titlePrefix}_Created`,
    };
    const itemBarcode = `${titlePrefix}_ItemBarcode`;
    // A unique, randomized call number instead of TestRail's literal "test" example - keeps
    // this run's browse row isolated from any other data/parallel runs (see similar pattern in
    // effective-location-facet-ignores-call-number.cy.js, C466165). Kept short and separate
    // from titlePrefix - the item's Call number field silently truncates long values, and
    // titlePrefix already carries a long random postfix
    const callNumberValue = `AT_C466178_CN_${randomLetters}`;
    const locationsAccordionName = 'Effective location (item)';
    const testData = {};

    before('Create test data and user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C466178_');
      // Making sure "Call numbers (all)" has no type restriction configured, matching the
      // TestRail precondition which doesn't mention any type configuration
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        callNumberTypes: [],
      });

      cy.then(() => {
        testData.servicePoint = ServicePoints.getDefaultServicePoint();
        ServicePoints.createViaApi(testData.servicePoint);
        testData.location = Location.getDefaultLocation(
          testData.servicePoint.id,
          `atc466178${randomLetters}`,
          `atc466178${randomLetters}`,
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
              itemLevelCallNumber: callNumberValue,
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

    after('Delete user, location, instances, restore settings', () => {
      cy.getAdminToken(false);
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        callNumberTypes: [],
      });
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
      'C466178 "Effective location (item)" facet doesn\'t show locations which are assigned to the items with empty "Effective call number" field during browse by "Call number (all)" option (promin)',
      { tags: ['extendedPath', 'promin', 'C466178'] },
      () => {
        BrowseCallNumber.waitForCallNumberToAppear(callNumberValue, true, 'all', 1);

        // Step 1: run call number browse - 1 exact match row at counter 1 (the seed item)
        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventorySearchAndFilter.browseSearch(callNumberValue);
        BrowseCallNumber.checkSearchResultsTable();
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumberValue, 1);

        // Step 2-3: expand "Effective location (item)" facet - this release loads every
        // location (no "+ More"), so instead of hunting for the lowest-counter location we
        // use our own dedicated test location, seeded with exactly 1 call-numbered item
        InventorySearchAndFilter.toggleAccordionByName(locationsAccordionName);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(locationsAccordionName, true);
        InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
          locationsAccordionName,
          testData.location.name,
          true,
          1,
        );
        InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
          locationsAccordionName,
          testData.location.name,
          1,
        );

        // Step 4: click the noted location - sum of "Number of titles" (1) matches the counter
        cy.intercept('GET', '**/browse/call-numbers/**').as('getCallNumbersByLocation');
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          locationsAccordionName,
          testData.location.name,
        );
        cy.wait('@getCallNumbersByLocation');
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumberValue, 1);

        // Step 5: Reset all
        InventorySearchAndFilter.clickResetAllButton();
        InventorySearchAndFilter.checkBrowseOptionSelected();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');

        // Step 6: switch to "Search" tab - empty Inventory pane
        InventorySearchAndFilter.switchToSearchTab();

        // Step 7: create a new Instance record via UI
        InventoryInstances.addNewInventory();
        InventoryNewInstance.fillRequiredValues(instanceTitles.created);
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 8: add Holdings with the noted location
        InventoryInstance.pressAddHoldingsButton();
        HoldingsRecordEdit.changePermanentLocation(testData.location.name);
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 9: add Item without a Call number
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

        // Step 10-11: run the same call number browse again
        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventorySearchAndFilter.browseSearch(callNumberValue);
        BrowseCallNumber.checkSearchResultsTable();
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumberValue, 1);

        // Step 12-13: same noted location - counter and sum of "Number of titles" are
        // unchanged at 1 - the newly created item has no Call number, so it's invisible to
        // the call-number-browse-scoped facet, unlike the Search-tab facet (C466165/C466186)
        InventorySearchAndFilter.toggleAccordionByName(locationsAccordionName);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(locationsAccordionName, true);
        InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
          locationsAccordionName,
          testData.location.name,
          true,
          1,
        );
        InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
          locationsAccordionName,
          testData.location.name,
          1,
        );
        cy.intercept('GET', '**/browse/call-numbers/**').as('getCallNumbersByLocationAgain');
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          locationsAccordionName,
          testData.location.name,
        );
        cy.wait('@getCallNumbersByLocationAgain');
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumberValue, 1);
      },
    );
  });
});
