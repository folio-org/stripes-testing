import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const sharedInstance1Title = `AT_C466203_FolioInstance_Shared_1_${randomPostfix}`;
      const sharedInstance2Title = `AT_C466203_FolioInstance_Shared_2_${randomPostfix}`;
      const sharedSuppressedInstanceTitle = `AT_C466203_FolioInstance_SharedSuppressed_${randomPostfix}`;
      const localInstanceTitle = `AT_C466203_FolioInstance_Local_${randomPostfix}`;
      // All 3 Shared instances share this exact subject text. The staff-suppressed one still
      // counts toward it, since nothing filters it out by default - same as the rest of the
      // Browse family (see C466214/C466190/C466200/C466198) - a platform-wide UI quirk (the
      // limiting ticket is still in draft), not specific to the non-consortia tests it was
      // first found in
      const subjectValue = `C466203_Subject_${randomPostfix}`;
      const querySearchOption = searchInstancesOptions[12]; // Subject
      const staffSuppressAccordionName = 'Staff suppress';
      const resourceTypeAccordionName = 'Resource type';
      // Unlike Contributor search, a plain Subject field search uses the same exact "==/string"
      // operator as the Browse-click redirect - there is no separate fuzzy/word-based variant
      const exactOperatorText = 'subjects.value==/string';
      const testData = {};

      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi('C466203_');
        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C466203_');

        cy.then(() => {
          cy.resetTenant();
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            testData.instanceTypeIdCentral = instanceTypes[0].id;
          });
          cy.setTenant(Affiliations.College);
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            testData.instanceTypeIdMember = instanceTypes[0].id;
          });
        })
          .then(() => {
            const createInstanceWithSubject = (
              title,
              instanceTypeId,
              { staffSuppress = false } = {},
            ) => {
              return InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  title,
                  instanceTypeId,
                  subjects: [{ value: subjectValue }],
                  ...(staffSuppress ? { staffSuppress: true } : {}),
                },
              });
            };

            cy.resetTenant();
            createInstanceWithSubject(sharedInstance1Title, testData.instanceTypeIdCentral);
            createInstanceWithSubject(sharedInstance2Title, testData.instanceTypeIdCentral);
            createInstanceWithSubject(
              sharedSuppressedInstanceTitle,
              testData.instanceTypeIdCentral,
              {
                staffSuppress: true,
              },
            );

            cy.setTenant(Affiliations.College);
            createInstanceWithSubject(localInstanceTitle, testData.instanceTypeIdMember);

            // User created in Central so it logs in there directly (ECS skill Pattern 1)
            cy.resetTenant();
            cy.createTempUser([
              Permissions.uiInventoryViewInstances.gui,
              Permissions.enableStaffSuppressFacet.gui,
            ]).then((createdUser) => {
              testData.user = createdUser;

              // Member affiliation isn't automatic (unlike Central) - assign it while still
              // under the Central tenant header, before switching to assign College permissions
              cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);

              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(testData.user.userId, [
                Permissions.uiInventoryViewInstances.gui,
                Permissions.enableStaffSuppressFacet.gui,
              ]);
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi('C466203_');

        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C466203_');
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C466203 Counter values are correct when switching from Browse by Subject to "Search" tab in Central tenant (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'C466203'] },
        () => {
          // Step 1: on Central, browse Subjects for the shared value - 3 Shared instances count
          // (the staff-suppressed one still counts, see note above; the Local/Member instance
          // isn't visible from Central at all)
          InventorySearchAndFilter.selectBrowseSubjects();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          BrowseSubjects.waitForSubjectToAppear(subjectValue, true, false, { numberOfTitles: 3 });
          InventorySearchAndFilter.fillInBrowseSearch(subjectValue);
          InventorySearchAndFilter.checkBrowseSearchInputFieldContent(subjectValue);
          InventorySearchAndFilter.clickSearch();
          BrowseSubjects.checkValueIsBold(subjectValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(subjectValue, 3);

          // Step 2-4: clicking the exact match redirects to Query search - all 3 Shared
          // instances are displayed, request carries the "==/string" operator
          const browseSearchAlias = InventorySearchAndFilter.interceptInstancesSearch();
          BrowseSubjects.selectRecordByTitle(subjectValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifySearchOptionAndQuery(querySearchOption, subjectValue);
          InventorySearchAndFilter.verifyNumberOfSearchResults(3);
          InventoryInstances.checkSearchResultCount(/3 records found/);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedInstance1Title);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedInstance2Title);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedSuppressedInstanceTitle);
          cy.wait(`@${browseSearchAlias}`).then((interception) => {
            expect(decodeURIComponent(interception.request.url)).to.include(exactOperatorText);
          });

          // Step 5-6: "Staff suppress" facet on the Search tab - neither option is preselected
          // (no default filtering - test cases are outdated here), so both show their real
          // counters: 2 not suppressed, 1 suppressed
          cy.intercept('GET', '/search/instances/facets?facet=staffSuppress*').as(
            'getStaffSuppressFacetFromBrowse',
          );
          InventorySearchAndFilter.toggleAccordionByName(staffSuppressAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            staffSuppressAccordionName,
            'No',
            false,
          );
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

          // Step 7: representative check on another always-populated facet (Resource type)
          cy.intercept('GET', '/search/instances/facets?*').as('getResourceTypeFacetFromBrowse');
          InventorySearchAndFilter.toggleAccordionByName(resourceTypeAccordionName);
          cy.wait('@getResourceTypeFacetFromBrowse').then((interception) => {
            expect(decodeURIComponent(interception.request.url)).to.include(exactOperatorText);
          });

          // Step 8: close both accordions first (Reset all doesn't do it for us), so the field
          // search below opens each one fresh instead of toggling an already-open accordion
          // closed, then Reset all clears search box/results and returns search option to
          // Keyword
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
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedInstance1Title);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedInstance2Title);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedSuppressedInstanceTitle);
          cy.wait(`@${fieldSearchAlias}`).then((interception) => {
            expect(decodeURIComponent(interception.request.url)).to.include(exactOperatorText);
          });

          // Step 11-12: "Staff suppress" facet after the field search - same real counters as
          // before (2 not suppressed / 1 suppressed)
          cy.intercept('GET', '/search/instances/facets?facet=staffSuppress*').as(
            'getStaffSuppressFacetFromSearch',
          );
          InventorySearchAndFilter.toggleAccordionByName(staffSuppressAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            staffSuppressAccordionName,
            'No',
            false,
          );
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

          // Step 14: switch active affiliation to the Member tenant
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();

          // Step 15: on Member, browse Subjects for the same value - now 4 instances count
          // (the 3 Shared + the Local one created directly on Member)
          cy.setTenant(Affiliations.College);
          InventorySearchAndFilter.selectBrowseSubjects();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          BrowseSubjects.waitForSubjectToAppear(subjectValue, true, false, { numberOfTitles: 4 });
          InventorySearchAndFilter.fillInBrowseSearch(subjectValue);
          InventorySearchAndFilter.checkBrowseSearchInputFieldContent(subjectValue);
          InventorySearchAndFilter.clickSearch();
          BrowseSubjects.checkValueIsBold(subjectValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(subjectValue, 4);

          // Step 16: clicking the exact match redirects to Query search - Shared and Local
          // instances are all displayed
          BrowseSubjects.selectRecordByTitle(subjectValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifySearchOptionAndQuery(querySearchOption, subjectValue);
          InventorySearchAndFilter.verifyNumberOfSearchResults(4);
          InventoryInstances.checkSearchResultCount(/4 records found/);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedInstance1Title);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedInstance2Title);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedSuppressedInstanceTitle);
          InventorySearchAndFilter.verifyInstanceDisplayed(localInstanceTitle);
        },
      );
    });
  });
});
