import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const sharedInstance1Title = `AT_C466198_FolioInstance_Shared_1_${randomPostfix}`;
      const sharedInstance2Title = `AT_C466198_FolioInstance_Shared_2_${randomPostfix}`;
      const sharedSuppressedInstanceTitle = `AT_C466198_FolioInstance_SharedSuppressed_${randomPostfix}`;
      const sharedNearMissInstanceTitle = `AT_C466198_FolioInstance_SharedNearMiss_${randomPostfix}`;
      const localInstanceTitle = `AT_C466198_FolioInstance_Local_${randomPostfix}`;
      const contributorBaseName = `C466198_Contributor_${randomPostfix}`;
      // These 3 Shared instances share this exact contributor text (base name + trailing
      // comma). The staff-suppressed one still counts toward it, since nothing filters it out
      // by default - same as the Call number/Contributors/Subject Browse family (see
      // C466214/C466190/C466200) - this is a platform-wide UI quirk (the limiting ticket is
      // still in draft), not something specific to the non-consortia tests it was first found in
      const contributorExactValue = `${contributorBaseName},`;
      // Same base name, different exact string (no comma, extra qualifier) - kept out of the
      // exact-match row/query, but still found by a fuzzy, word-based search for the bare base
      // name - only used for the Central-tenant field search (Steps 9-10)
      const contributorNearMissValue = `${contributorBaseName} Jr`;
      const querySearchOption = searchInstancesOptions[1]; // Contributor
      const staffSuppressAccordionName = 'Staff suppress';
      const resourceTypeAccordionName = 'Resource type';
      const exactOperatorText = 'contributors.name==/string';
      const fuzzyOperatorText = 'contributors.name="';
      const testData = {};

      before('Create test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi('C466198_');
        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C466198_');

        cy.then(() => {
          cy.resetTenant();
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            testData.instanceTypeIdCentral = instanceTypes[0].id;
          });
          BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
            testData.contributorNameTypeIdCentral = contributorNameTypes[0].id;
          });
          cy.setTenant(Affiliations.College);
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            testData.instanceTypeIdMember = instanceTypes[0].id;
          });
          BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
            testData.contributorNameTypeIdMember = contributorNameTypes[0].id;
          });
        })
          .then(() => {
            const createInstanceWithContributor = (
              title,
              contributorName,
              instanceTypeId,
              contributorNameTypeId,
              { staffSuppress = false } = {},
            ) => {
              return InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  title,
                  instanceTypeId,
                  contributors: [
                    {
                      name: contributorName,
                      contributorNameTypeId,
                      contributorTypeText: '',
                      primary: false,
                    },
                  ],
                  ...(staffSuppress ? { staffSuppress: true } : {}),
                },
              });
            };

            cy.resetTenant();
            createInstanceWithContributor(
              sharedInstance1Title,
              contributorExactValue,
              testData.instanceTypeIdCentral,
              testData.contributorNameTypeIdCentral,
            );
            createInstanceWithContributor(
              sharedInstance2Title,
              contributorExactValue,
              testData.instanceTypeIdCentral,
              testData.contributorNameTypeIdCentral,
            );
            createInstanceWithContributor(
              sharedSuppressedInstanceTitle,
              contributorExactValue,
              testData.instanceTypeIdCentral,
              testData.contributorNameTypeIdCentral,
              { staffSuppress: true },
            );
            createInstanceWithContributor(
              sharedNearMissInstanceTitle,
              contributorNearMissValue,
              testData.instanceTypeIdCentral,
              testData.contributorNameTypeIdCentral,
            );

            cy.setTenant(Affiliations.College);
            createInstanceWithContributor(
              localInstanceTitle,
              contributorExactValue,
              testData.instanceTypeIdMember,
              testData.contributorNameTypeIdMember,
            );

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
        InventoryInstances.deleteFullInstancesByTitleViaApi('C466198_');

        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C466198_');
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C466198 Counter values are correct when switching from Browse by Contributors to "Search" tab in Central tenant (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'C466198'] },
        () => {
          // Step 1: on Central, browse Contributors for the exact value - 3 Shared instances
          // count (the staff-suppressed one still counts, see note above; the near-miss text
          // keeps the near-miss Shared instance out, and the Local/Member instance isn't
          // visible from Central at all)
          InventorySearchAndFilter.selectBrowseContributors();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          BrowseContributors.waitForContributorToAppear(
            contributorExactValue,
            true,
            false,
            undefined,
            3,
          );
          InventorySearchAndFilter.fillInBrowseSearch(contributorExactValue);
          InventorySearchAndFilter.checkBrowseSearchInputFieldContent(contributorExactValue);
          InventorySearchAndFilter.clickSearch();
          BrowseContributors.checkSearchResultRecord(contributorExactValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            contributorExactValue,
            3,
          );

          // Step 2-4: clicking the exact match redirects to Query search - all 3 Shared
          // instances are displayed, request carries the "==/string" operator
          const browseSearchAlias = InventorySearchAndFilter.interceptInstancesSearch();
          BrowseSubjects.selectRecordByTitle(contributorExactValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifySearchOptionAndQuery(
            querySearchOption,
            contributorExactValue,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(3);
          InventoryInstances.checkSearchResultCount(/3 records found/);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedInstance1Title);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedInstance2Title);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedSuppressedInstanceTitle);
          cy.wait(`@${browseSearchAlias}`).then((interception) => {
            expect(decodeURIComponent(interception.request.url)).to.include(exactOperatorText);
          });

          // Step 5-6: "Staff suppress" facet on the Search tab - neither option is preselected
          // (no default filtering, same as the rest of the Browse family - test cases are
          // outdated here), so both show their real counters: 2 not suppressed, 1 suppressed
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

          // Step 9-10: a plain "Contributor" field search for the bare base name is a fuzzy,
          // word-based match - it finds all 4 Shared instances (the near-miss text still
          // contains the base name as its own word), request carries the "=" operator
          const fieldSearchAlias = InventorySearchAndFilter.interceptInstancesSearch();
          InventorySearchAndFilter.searchByParameter(querySearchOption, contributorBaseName);
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(querySearchOption);
          InventorySearchAndFilter.checkSearchQueryText(contributorBaseName);
          InventorySearchAndFilter.verifyNumberOfSearchResults(4);
          InventoryInstances.checkSearchResultCount(/4 records found/);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedInstance1Title);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedInstance2Title);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedSuppressedInstanceTitle);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedNearMissInstanceTitle);
          cy.wait(`@${fieldSearchAlias}`).then((interception) => {
            expect(decodeURIComponent(interception.request.url)).to.include(fuzzyOperatorText);
          });

          // Step 11-12: "Staff suppress" facet after the field search - neither option is
          // preselected, counters are 3 not suppressed / 1 suppressed
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
          InventorySearchAndFilter.verifyFilterOptionCount(staffSuppressAccordionName, 'No', 3);
          InventorySearchAndFilter.verifyFilterOptionCount(staffSuppressAccordionName, 'Yes', 1);
          cy.wait('@getStaffSuppressFacetFromSearch').then((interception) => {
            expect(decodeURIComponent(interception.request.url)).to.include(fuzzyOperatorText);
          });

          // Step 13: same representative Resource type facet check for the field search
          cy.intercept('GET', '/search/instances/facets?*').as('getResourceTypeFacetFromSearch');
          InventorySearchAndFilter.toggleAccordionByName(resourceTypeAccordionName);
          cy.wait('@getResourceTypeFacetFromSearch').then((interception) => {
            expect(decodeURIComponent(interception.request.url)).to.include(fuzzyOperatorText);
          });

          // Step 14: switch active affiliation to the Member tenant
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();

          // Step 15: on Member, browse Contributors for the same exact value - now 4 instances
          // count (the 3 Shared + the Local one created directly on Member)
          cy.setTenant(Affiliations.College);
          InventorySearchAndFilter.selectBrowseContributors();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          BrowseContributors.waitForContributorToAppear(
            contributorExactValue,
            true,
            false,
            undefined,
            4,
          );
          InventorySearchAndFilter.fillInBrowseSearch(contributorExactValue);
          InventorySearchAndFilter.checkBrowseSearchInputFieldContent(contributorExactValue);
          InventorySearchAndFilter.clickSearch();
          BrowseContributors.checkSearchResultRecord(contributorExactValue);
          BrowseSubjects.verifyNumberOfTitlesForRowWithValueAndNoAuthorityIcon(
            contributorExactValue,
            4,
          );

          // Step 16: clicking the exact match redirects to Query search - Shared and Local
          // instances are all displayed
          BrowseSubjects.selectRecordByTitle(contributorExactValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifySearchOptionAndQuery(
            querySearchOption,
            contributorExactValue,
          );
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
