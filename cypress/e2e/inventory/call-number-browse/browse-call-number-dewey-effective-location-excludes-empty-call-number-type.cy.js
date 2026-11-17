import {
  BROWSE_CALL_NUMBER_OPTIONS,
  CALL_NUMBER_TYPE_NAMES,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import {
  CallNumberBrowseSettings,
  callNumbersIds,
} from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(6);
    const titlePrefix = `AT_C656309_FolioInstance_${randomPostfix}`;
    const instanceTitles = {
      // The only item of the location that is visible to the "Dewey Decimal classification" browse:
      // Dewey call number type and a call number
      counted: `${titlePrefix}_Counted`,
      // The items of the TestRail precondition, they must not change the counter of the location
      notCounted: `${titlePrefix}_NotCounted`,
    };
    // Short unique values: the item's Call number field silently truncates long values
    const deweyCallNumber = `AT_C656309_CN_${randomLetters}`;
    const emptyTypeCallNumber = `AT_C656309_NoType_${randomLetters}`;
    const locationsAccordionName = 'Effective location (item)';
    const deweyOption = BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL;
    const testData = {};

    before('Create test data and user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C656309_');

      // The "Dewey Decimal classification" option has the "Dewey Decimal classification" call
      // number type selected (TestRail precondition)
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: deweyOption,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL],
      });

      cy.then(() => {
        testData.servicePoint = ServicePoints.getDefaultServicePoint();
        ServicePoints.createViaApi(testData.servicePoint);
        testData.location = Location.getDefaultLocation(
          testData.servicePoint.id,
          `atc656309${randomLetters}`,
          `atc656309${randomLetters}`,
        );
        Location.createViaApi(testData.location).then((location) => {
          testData.location.id = location.id;
        });
        CallNumberTypes.getCallNumberTypesViaAPI().then((types) => {
          testData.deweyTypeId = types.find(
            (type) => type.name === CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL,
          ).id;
        });
        cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1, query: 'source<>local' }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source<>local' }).then((res) => {
          testData.materialTypeId = res.id;
        });
      }).then(() => {
        const getItem = (callNumberFields) => ({
          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
          permanentLoanType: { id: testData.loanTypeId },
          materialType: { id: testData.materialTypeId },
          ...callNumberFields,
        });
        const createInstance = (title, items) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: { title, instanceTypeId: testData.instanceTypeId },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.location.id,
              },
            ],
            items,
          });
        };

        // The counter of the location is 1: one item with a Dewey call number
        createInstance(instanceTitles.counted, [
          getItem({
            itemLevelCallNumber: deweyCallNumber,
            itemLevelCallNumberTypeId: testData.deweyTypeId,
          }),
        ]);
        // Item 1: Dewey type, empty call number; Item 2: empty type, call number "Test value"
        createInstance(instanceTitles.notCounted, [
          getItem({ itemLevelCallNumberTypeId: testData.deweyTypeId }),
          getItem({ itemLevelCallNumber: emptyTypeCallNumber }),
        ]);

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
      // No call number types selected is the default of the option. The helper finds the config
      // of the option by name and keeps its shelving algorithm
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: deweyOption,
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
      'C656309 "Effective location (item)" facet doesn\'t show locations which are assigned to the items with empty "Call number type" field during browse by "Dewey Decimal classification" option (promin)',
      { tags: ['extendedPath', 'promin', 'nonParallel', 'C656309'] },
      () => {
        BrowseCallNumber.waitForCallNumberToAppear(
          deweyCallNumber,
          true,
          callNumbersIds[deweyOption],
          1,
        );

        // Step 1: run the Dewey Decimal classification browse - the call numbers are displayed,
        // the "Effective location (item)" accordion is collapsed
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(deweyOption);
        InventorySearchAndFilter.checkBrowseOptionSelected(deweyOption);
        InventorySearchAndFilter.browseSearch(deweyCallNumber);
        BrowseCallNumber.checkSearchResultsTable();
        BrowseCallNumber.valueInResultTableIsHighlighted(deweyCallNumber);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(locationsAccordionName, false);

        // Step 2: expand the "Effective location (item)" facet and find the own location
        // (this release loads every location, there is no "+ More")
        InventorySearchAndFilter.toggleAccordionByName(locationsAccordionName);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(locationsAccordionName, true);
        InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
          locationsAccordionName,
          testData.location.name,
          true,
          1,
        );

        // Step 3: the counter of the location has not changed - only the item with the Dewey
        // call number type and a call number is counted, the items of the second instance are not
        InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
          locationsAccordionName,
          testData.location.name,
          1,
        );
      },
    );
  });
});
