import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C466190_FolioInstance_${randomPostfix}`;
    const instance1Title = `${instanceTitlePrefix}_1`;
    const instance2Title = `${instanceTitlePrefix}_2`;
    const instance3Title = `${instanceTitlePrefix}_3`;
    const instance4Title = `${instanceTitlePrefix}_4`;
    const contributorBaseName = `C466190_Contributor_${randomPostfix}`;
    // Instances 1, 2 & 4 share this exact contributor text (base name + trailing comma).
    // Staff-suppressed instance 4 still counts toward it, since nothing filters it out by
    // default - same as the Call number Browse family (see C466214)
    const contributorExactValue = `${contributorBaseName},`;
    // Instance 3 - same base name, different exact string (no comma, extra qualifier) - kept
    // out of the exact-match row/query, but still found by a fuzzy, word-based search for the
    // bare base name
    const contributorNearMissValue = `${contributorBaseName} Jr`;
    const querySearchOption = searchInstancesOptions[1]; // Contributor
    const staffSuppressAccordionName = 'Staff suppress';
    const resourceTypeAccordionName = 'Resource type';
    const exactOperatorText = 'contributors.name==/string';
    const fuzzyOperatorText = 'contributors.name="';
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C466190_');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
        BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
          testData.contributorNameTypeId = contributorNameTypes[0].id;
        });
      }).then(() => {
        const createInstanceWithContributor = (
          title,
          contributorName,
          { staffSuppress = false } = {},
        ) => {
          return InventoryInstances.createFolioInstanceViaApi({
            instance: {
              title,
              instanceTypeId: testData.instanceTypeId,
              contributors: [
                {
                  name: contributorName,
                  contributorNameTypeId: testData.contributorNameTypeId,
                  contributorTypeText: '',
                  primary: false,
                },
              ],
              ...(staffSuppress ? { staffSuppress: true } : {}),
            },
          });
        };

        createInstanceWithContributor(instance1Title, contributorExactValue);
        createInstanceWithContributor(instance2Title, contributorExactValue);
        createInstanceWithContributor(instance3Title, contributorNearMissValue);
        createInstanceWithContributor(instance4Title, contributorExactValue, {
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
      'C466190 Counter values are correct when switching from Browse by Contributors to "Search" tab (promin)',
      { tags: ['criticalPath', 'promin', 'C466190'] },
      () => {
        // Step 1: browse Contributors for the exact contributor text - exact match row counter
        // is 3 (1, 2 & 4 - instance 3's differently-punctuated contributor text keeps it out)
        InventorySearchAndFilter.selectBrowseContributors();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        BrowseContributors.waitForContributorToAppear(contributorExactValue, true, false, 1, 3);
        InventorySearchAndFilter.fillInBrowseSearch(contributorExactValue);
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(contributorExactValue);
        InventorySearchAndFilter.clickSearch();
        BrowseContributors.checkSearchResultRecord(contributorExactValue);
        BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
          contributorExactValue,
          3,
        );

        // Step 2-4: clicking the exact match redirects to Query search with the Contributor
        // search option and value - the instances search request carries the "==/string"
        // operator (exact match), not a looser one
        const exactSearchAlias = InventorySearchAndFilter.interceptInstancesSearch();
        BrowseSubjects.selectRecordByTitle(contributorExactValue);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          querySearchOption,
          contributorExactValue,
        );
        InventorySearchAndFilter.verifyNumberOfSearchResults(3);
        InventoryInstances.checkSearchResultCount(/3 records found/);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance1Title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance2Title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance4Title);
        cy.wait(`@${exactSearchAlias}`).then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include(exactOperatorText);
        });

        // Step 5-6: "Staff suppress" facet on the Search tab - neither option is preselected,
        // so both show with their real counters: 2 not suppressed, 1 suppressed - its own
        // request also carries the "==/string" operator
        cy.intercept('GET', '/search/instances/facets?facet=staffSuppress*').as(
          'getStaffSuppressFacetExact',
        );
        InventorySearchAndFilter.toggleAccordionByName(staffSuppressAccordionName);
        InventorySearchAndFilter.verifyCheckboxInAccordion(staffSuppressAccordionName, 'No', false);
        InventorySearchAndFilter.verifyCheckboxInAccordion(
          staffSuppressAccordionName,
          'Yes',
          false,
        );
        InventorySearchAndFilter.verifyFilterOptionCount(staffSuppressAccordionName, 'No', 2);
        InventorySearchAndFilter.verifyFilterOptionCount(staffSuppressAccordionName, 'Yes', 1);
        cy.wait('@getStaffSuppressFacetExact').then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include(exactOperatorText);
        });

        // Step 7: representative check on another always-populated facet (Resource type) -
        // not an exhaustive sweep of every accordion, but the same operator verification
        cy.intercept('GET', '/search/instances/facets?*').as('getResourceTypeFacetExact');
        InventorySearchAndFilter.toggleAccordionByName(resourceTypeAccordionName);
        cy.wait('@getResourceTypeFacetExact').then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include(exactOperatorText);
        });

        // Step 8: close both accordions first (Reset all doesn't do it for us), so the Fuzzy
        // phase below opens each one fresh instead of toggling an already-open accordion closed
        InventorySearchAndFilter.toggleAccordionByName(staffSuppressAccordionName, false);
        InventorySearchAndFilter.toggleAccordionByName(resourceTypeAccordionName, false);
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.searchTypeDropdownDefaultValue(searchInstancesOptions[0]);

        // Step 9-10: searching by the bare base name (no trailing comma) on the Contributor
        // field is a fuzzy, word-based match - it finds all 4 instances (the near-miss text in
        // instance 3 still contains the base name as its own word) - its request carries the
        // "=" operator, not "==/string"
        const fuzzySearchAlias = InventorySearchAndFilter.interceptInstancesSearch();
        InventorySearchAndFilter.searchByParameter(querySearchOption, contributorBaseName);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(querySearchOption);
        InventorySearchAndFilter.checkSearchQueryText(contributorBaseName);
        InventorySearchAndFilter.verifyNumberOfSearchResults(4);
        InventoryInstances.checkSearchResultCount(/4 records found/);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance1Title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance2Title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance3Title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance4Title);
        cy.wait(`@${fuzzySearchAlias}`).then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include(fuzzyOperatorText);
        });

        // Step 11-12: "Staff suppress" facet after the fuzzy search - neither option is
        // preselected, counters are 3 not suppressed / 1 suppressed - its own request also
        // carries the "=" operator
        cy.intercept('GET', '/search/instances/facets?facet=staffSuppress*').as(
          'getStaffSuppressFacetFuzzy',
        );
        InventorySearchAndFilter.toggleAccordionByName(staffSuppressAccordionName);
        InventorySearchAndFilter.verifyCheckboxInAccordion(staffSuppressAccordionName, 'No', false);
        InventorySearchAndFilter.verifyCheckboxInAccordion(
          staffSuppressAccordionName,
          'Yes',
          false,
        );
        InventorySearchAndFilter.verifyFilterOptionCount(staffSuppressAccordionName, 'No', 3);
        InventorySearchAndFilter.verifyFilterOptionCount(staffSuppressAccordionName, 'Yes', 1);
        cy.wait('@getStaffSuppressFacetFuzzy').then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include(fuzzyOperatorText);
        });

        // Step 13: same representative Resource type facet check for the fuzzy search
        cy.intercept('GET', '/search/instances/facets?*').as('getResourceTypeFacetFuzzy');
        InventorySearchAndFilter.toggleAccordionByName(resourceTypeAccordionName);
        cy.wait('@getResourceTypeFacetFuzzy').then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include(fuzzyOperatorText);
        });
      },
    );
  });
});
