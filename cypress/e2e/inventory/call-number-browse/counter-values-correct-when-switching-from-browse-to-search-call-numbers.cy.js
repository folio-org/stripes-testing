import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { BROWSE_CALL_NUMBER_OPTIONS, ITEM_STATUS_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C466214_FolioInstance_${randomPostfix}`;
    const instance1Title = `${instanceTitlePrefix}_1`;
    const instance2Title = `${instanceTitlePrefix}_2`;
    const instance4Title = `${instanceTitlePrefix}_4`;
    // Instances 1, 2 & 4 share this exact call number text. On Trillium/Umbrellaleaf, a user
    // with the "Enable staff suppress facet" permission gets no preselected "No" filter and
    // sees staff-suppressed records too (the ticket to limit Browse to not-staff-suppressed
    // results by default is still in draft) - so all 3 count toward the exact-match row
    const callNumberValue = `C466214 cn_test ${randomPostfix}`;
    // Instance 3 - same tokens, different order - a different string, so it must land in a
    // different browse row rather than being folded into the exact-match counter above
    const reorderedCallNumberValue = `cn_test C4662149 ${randomPostfix}`;
    const querySearchOption = 'Query search';
    const searchQuery = `itemFullCallNumbers="${callNumberValue}"`;
    const staffSuppressAccordionName = 'Staff suppress';
    const resourceTypeAccordionName = 'Resource type';
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C466214_');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((holdingTypes) => {
          testData.holdingTypeId = holdingTypes[0].id;
        });
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
        }).then((location) => {
          testData.location = location;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          testData.materialTypeId = res.id;
        });
      }).then(() => {
        const createInstanceWithCallNumber = (
          title,
          callNumber,
          { staffSuppress = false } = {},
        ) => {
          return InventoryInstances.createFolioInstanceViaApi({
            instance: {
              title,
              instanceTypeId: testData.instanceTypeId,
              ...(staffSuppress ? { staffSuppress: true } : {}),
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.location.id,
              },
            ],
            items: [
              {
                itemLevelCallNumber: callNumber,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          });
        };

        createInstanceWithCallNumber(instance1Title, callNumberValue);
        createInstanceWithCallNumber(instance2Title, callNumberValue);
        createInstanceWithCallNumber(`${instanceTitlePrefix}_3`, reorderedCallNumberValue);
        createInstanceWithCallNumber(instance4Title, callNumberValue, {
          staffSuppress: true,
        });

        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.enableStaffSuppressFacet.gui,
        ]).then((createdUser) => {
          testData.user = createdUser;
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
    });

    it(
      'C466214 Counter values are correct when switching from Browse by Call numbers to "Search" tab (promin)',
      { tags: ['criticalPath', 'promin', 'C466214'] },
      () => {
        // Step 1: browse "Call numbers (all)" for the shared call number - exact match row
        // counter is 3 (1, 2 & 4 - the reordered-text instance 3 is the only one that lands
        // in a different row; staff-suppressed instance 4 still counts, see note above)
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );
        BrowseCallNumber.waitForCallNumberToAppear(callNumberValue, true, undefined, 3);
        InventorySearchAndFilter.browseSearch(callNumberValue);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumberValue, '3');

        // Step 2-4: clicking the exact match redirects to Query search with the call number
        // query - "DevTools" is simulated by intercepting the instances search request and
        // checking it carries the "=" operator with the call number (not a looser match)
        const searchAlias = InventorySearchAndFilter.interceptInstancesSearch();
        BrowseCallNumber.clickOnResult(callNumberValue);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.verifySearchOptionAndQuery(querySearchOption, searchQuery);
        InventorySearchAndFilter.verifyNumberOfSearchResults(3);
        InventoryInstances.checkSearchResultCount(/3 records found/);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance1Title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance2Title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance4Title);
        cy.wait(`@${searchAlias}`).then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include('itemFullCallNumbers="');
        });

        // Step 5-6: "Staff suppress" facet on the Search tab - neither option is preselected,
        // so both show with their real counters: 2 not suppressed, 1 suppressed - its own
        // request also carries the "=" operator with the call number
        cy.intercept('GET', '/search/instances/facets?facet=staffSuppress*').as(
          'getStaffSuppressFacet',
        );
        InventorySearchAndFilter.expandAccordion(staffSuppressAccordionName);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(staffSuppressAccordionName, true);
        InventorySearchAndFilter.verifyCheckboxInAccordion(staffSuppressAccordionName, 'No', false);
        InventorySearchAndFilter.verifyCheckboxInAccordion(
          staffSuppressAccordionName,
          'Yes',
          false,
        );
        InventorySearchAndFilter.verifyFilterOptionCount(staffSuppressAccordionName, 'No', 2);
        InventorySearchAndFilter.verifyFilterOptionCount(staffSuppressAccordionName, 'Yes', 1);
        cy.wait('@getStaffSuppressFacet').then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include('itemFullCallNumbers="');
        });

        // Step 7: representative check on another always-populated facet (Resource type) -
        // not an exhaustive sweep of every accordion, but the same "=" operator verification
        cy.intercept('GET', '/search/instances/facets?*').as('getResourceTypeFacet');
        InventorySearchAndFilter.expandAccordion(resourceTypeAccordionName);
        InventorySearchAndFilter.verifyAccordionByNameExpanded(resourceTypeAccordionName, true);
        cy.wait('@getResourceTypeFacet').then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include('itemFullCallNumbers="');
        });

        // Step 8: Reset all clears search box/results and returns search option to Keyword
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.searchTypeDropdownDefaultValue(searchInstancesOptions[0]);
      },
    );
  });
});
