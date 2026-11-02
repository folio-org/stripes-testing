import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C466200_FolioInstance_${randomPostfix}`;
    const instance1Title = `${instanceTitlePrefix}_1`;
    const instance2Title = `${instanceTitlePrefix}_2`;
    const instance3Title = `${instanceTitlePrefix}_3`;
    // All 3 instances share this exact subject text. Staff-suppressed instance 3 still counts
    // toward it, since nothing filters it out by default - same as the Call number/Contributors
    // Browse family (see C466214/C466190)
    const subjectValue = `C466200_Subject_${randomPostfix}`;
    const querySearchOption = searchInstancesOptions[12]; // Subject
    const staffSuppressAccordionName = 'Staff suppress';
    const resourceTypeAccordionName = 'Resource type';
    // Unlike Contributor search, a plain Subject field search uses the same exact "==/string"
    // operator as the Browse-click redirect - there is no separate fuzzy/word-based variant
    const exactOperatorText = 'subjects.value==/string';
    const testData = {};

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C466200_');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });
      }).then(() => {
        const createInstanceWithSubject = (title, { staffSuppress = false } = {}) => {
          return InventoryInstances.createFolioInstanceViaApi({
            instance: {
              title,
              instanceTypeId: testData.instanceTypeId,
              subjects: [{ value: subjectValue }],
              ...(staffSuppress ? { staffSuppress: true } : {}),
            },
          });
        };

        createInstanceWithSubject(instance1Title);
        createInstanceWithSubject(instance2Title);
        createInstanceWithSubject(instance3Title, { staffSuppress: true });

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
      'C466200 Counter values are correct when switching from Browse by Subject to "Search" tab (promin)',
      { tags: ['criticalPath', 'promin', 'C466200'] },
      () => {
        // Step 1: browse Subjects for the shared value - exact match row is bold (exact match)
        // and its "Number of titles" counter is 3
        InventorySearchAndFilter.selectBrowseSubjects();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        BrowseSubjects.waitForSubjectToAppear(subjectValue, true, false, { numberOfTitles: 3 });
        InventorySearchAndFilter.fillInBrowseSearch(subjectValue);
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(subjectValue);
        InventorySearchAndFilter.clickSearch();
        BrowseSubjects.checkValueIsBold(subjectValue);
        BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(subjectValue, 3);

        // Step 2-4: clicking the exact match redirects to Query search with the Subject search
        // option and value - the instances search request carries the "==/string" operator
        const browseSearchAlias = InventorySearchAndFilter.interceptInstancesSearch();
        BrowseSubjects.selectRecordByTitle(subjectValue);
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.verifySearchOptionAndQuery(querySearchOption, subjectValue);
        InventorySearchAndFilter.verifyNumberOfSearchResults(3);
        InventoryInstances.checkSearchResultCount(/3 records found/);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance1Title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance2Title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance3Title);
        cy.wait(`@${browseSearchAlias}`).then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include(exactOperatorText);
        });

        // Step 5-6: "Staff suppress" facet on the Search tab - neither option is preselected,
        // so both show with their real counters: 2 not suppressed, 1 suppressed - its own
        // request also carries the "==/string" operator
        cy.intercept('GET', '/search/instances/facets?facet=staffSuppress*').as(
          'getStaffSuppressFacetFromBrowse',
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
        cy.wait('@getStaffSuppressFacetFromBrowse').then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include(exactOperatorText);
        });

        // Step 7: representative check on another always-populated facet (Resource type) -
        // not an exhaustive sweep of every accordion, but the same operator verification
        cy.intercept('GET', '/search/instances/facets?*').as('getResourceTypeFacetFromBrowse');
        InventorySearchAndFilter.toggleAccordionByName(resourceTypeAccordionName);
        cy.wait('@getResourceTypeFacetFromBrowse').then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include(exactOperatorText);
        });

        // Step 8: close both accordions first (Reset all doesn't do it for us), so the second
        // search below opens each one fresh instead of toggling an already-open accordion
        // closed, then Reset all clears search box/results and returns search option to Keyword
        InventorySearchAndFilter.toggleAccordionByName(staffSuppressAccordionName, false);
        InventorySearchAndFilter.toggleAccordionByName(resourceTypeAccordionName, false);
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
        InventorySearchAndFilter.searchTypeDropdownDefaultValue(searchInstancesOptions[0]);

        // Step 9-10: a plain "Subject" field search for the same value uses the same exact
        // "==/string" operator (unlike Contributor search, there is no fuzzy variant) and
        // returns the same 3 records
        const fieldSearchAlias = InventorySearchAndFilter.interceptInstancesSearch();
        InventorySearchAndFilter.searchByParameter(querySearchOption, subjectValue);
        InventorySearchAndFilter.verifyDefaultSearchOptionSelected(querySearchOption);
        InventorySearchAndFilter.checkSearchQueryText(subjectValue);
        InventorySearchAndFilter.verifyNumberOfSearchResults(3);
        InventoryInstances.checkSearchResultCount(/3 records found/);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance1Title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance2Title);
        InventorySearchAndFilter.verifyInstanceDisplayed(instance3Title);
        cy.wait(`@${fieldSearchAlias}`).then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include(exactOperatorText);
        });

        // Step 11-12: "Staff suppress" facet after the field search - same real counters as
        // before (2 not suppressed / 1 suppressed) - its own request also carries "==/string"
        cy.intercept('GET', '/search/instances/facets?facet=staffSuppress*').as(
          'getStaffSuppressFacetFromSearch',
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
        cy.wait('@getStaffSuppressFacetFromSearch').then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include(exactOperatorText);
        });

        // Step 13: same representative Resource type facet check for the field search
        cy.intercept('GET', '/search/instances/facets?*').as('getResourceTypeFacetFromSearch');
        InventorySearchAndFilter.toggleAccordionByName(resourceTypeAccordionName);
        cy.wait('@getResourceTypeFacetFromSearch').then((interception) => {
          expect(decodeURIComponent(interception.request.url)).to.include(exactOperatorText);
        });
      },
    );
  });
});
