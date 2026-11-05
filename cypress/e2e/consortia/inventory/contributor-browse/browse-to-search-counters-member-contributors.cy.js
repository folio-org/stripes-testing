import { COMMON_BUTTON_LABELS } from '../../../../support/constants';
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
      const sharedInstance1Title = `AT_C466199_FolioInstance_Shared_1_${randomPostfix}`;
      const sharedInstance2Title = `AT_C466199_FolioInstance_Shared_2_${randomPostfix}`;
      const sharedNearMissInstanceTitle = `AT_C466199_FolioInstance_SharedNearMiss_${randomPostfix}`;
      const localInstance1Title = `AT_C466199_FolioInstance_Local_1_${randomPostfix}`;
      const localSuppressedInstanceTitle = `AT_C466199_FolioInstance_LocalSuppressed_${randomPostfix}`;
      const localNearMissInstanceTitle = `AT_C466199_FolioInstance_LocalNearMiss_${randomPostfix}`;
      const contributorBaseName = `C466199_Contributor_${randomPostfix}`;
      // 2 Shared + 2 Local instances share this exact contributor text (base name + trailing
      // comma). The staff-suppressed Local one still counts toward it, since nothing filters it
      // out by default - same as the rest of the Contributors/Call number/Subject Browse family
      // (see C466198/C466190/C466200/C466214) - this is a platform-wide UI quirk, not something
      // specific to this tenant
      const contributorExactValue = `${contributorBaseName},`;
      // Same base name, different exact string (no comma, extra qualifier) - kept out of the
      // exact-match row/query, but still found by a fuzzy, word-based search for the bare base
      // name - only used for the field search (Steps 9-10)
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
        InventoryInstances.deleteFullInstancesByTitleViaApi('C466199_');
        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C466199_');

        cy.then(() => {
          cy.resetTenant();
          cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
            testData.instanceTypeIdCentral = instanceTypes[0].id;
          });
          BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
            testData.contributorNameTypeIdCentral = contributorNameTypes[0].id;
          });
          cy.setTenant(Affiliations.College);
          cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
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
              sharedNearMissInstanceTitle,
              contributorNearMissValue,
              testData.instanceTypeIdCentral,
              testData.contributorNameTypeIdCentral,
            );

            cy.setTenant(Affiliations.College);
            createInstanceWithContributor(
              localInstance1Title,
              contributorExactValue,
              testData.instanceTypeIdMember,
              testData.contributorNameTypeIdMember,
            );
            createInstanceWithContributor(
              localSuppressedInstanceTitle,
              contributorExactValue,
              testData.instanceTypeIdMember,
              testData.contributorNameTypeIdMember,
              { staffSuppress: true },
            );
            createInstanceWithContributor(
              localNearMissInstanceTitle,
              contributorNearMissValue,
              testData.instanceTypeIdMember,
              testData.contributorNameTypeIdMember,
            );

            // User created in Member (College) so it logs in there directly (ECS skill Pattern 1);
            // Shared instances are visible from Member without any Central permissions
            cy.setTenant(Affiliations.College);
            cy.createTempUser([
              Permissions.uiInventoryViewInstances.gui,
              Permissions.enableStaffSuppressFacet.gui,
            ]).then((createdUser) => {
              testData.user = createdUser;
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi('C466199_');
        Users.deleteViaApi(testData.user.userId);

        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C466199_');
      });

      it(
        'C466199 Counter values are correct when switching from Browse by Contributors to "Search" tab in Member tenant (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'C466199'] },
        () => {
          cy.setTenant(Affiliations.College);
          cy.getToken(testData.user.username, testData.user.password);

          // Step 1: on Member, browse Contributors for the exact value - 4 instances count
          // (2 Shared + 2 Local; the staff-suppressed Local one still counts, see note above;
          // the near-miss text keeps both near-miss instances out)
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

          // Step 2-4: clicking the exact match redirects to Query search - 2 Shared and 2 Local
          // instances are displayed, request carries the "==/string" operator
          const browseSearchAlias = InventorySearchAndFilter.interceptInstancesSearch();
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
          InventorySearchAndFilter.verifyInstanceDisplayed(localInstance1Title);
          InventorySearchAndFilter.verifyInstanceDisplayed(localSuppressedInstanceTitle);
          cy.wait(`@${browseSearchAlias}`).then((interception) => {
            expect(decodeURIComponent(interception.request.url)).to.include(exactOperatorText);
          });

          // Step 5-6: "Staff suppress" facet on the Search tab - neither option is preselected
          // (no default filtering, same as the rest of the Browse family - test cases are
          // outdated here), so both show their real counters: 3 not suppressed, 1 suppressed
          cy.intercept('GET', '/search/instances/facets?facet=staffSuppress*').as(
            'getStaffSuppressFacetFromBrowse',
          );
          InventorySearchAndFilter.toggleAccordionByName(staffSuppressAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            staffSuppressAccordionName,
            COMMON_BUTTON_LABELS.NO,
            false,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            staffSuppressAccordionName,
            COMMON_BUTTON_LABELS.YES,
            false,
          );
          InventorySearchAndFilter.verifyFilterOptionCount(
            staffSuppressAccordionName,
            COMMON_BUTTON_LABELS.NO,
            3,
          );
          InventorySearchAndFilter.verifyFilterOptionCount(
            staffSuppressAccordionName,
            COMMON_BUTTON_LABELS.YES,
            1,
          );
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
          // Reset all brings the default "Held by" filter back in a Member tenant - clear it,
          // otherwise the field search only finds instances with Member holdings (none here)
          InventorySearchAndFilter.clearDefaultHeldbyFilter();

          // Step 9-10: a plain "Contributor" field search for the bare base name is a fuzzy,
          // word-based match - it finds all 6 instances visible from Member (the near-miss text
          // still contains the base name as its own word), request carries the "=" operator
          const fieldSearchAlias = InventorySearchAndFilter.interceptInstancesSearch();
          InventorySearchAndFilter.searchByParameter(querySearchOption, contributorBaseName);
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(querySearchOption);
          InventorySearchAndFilter.checkSearchQueryText(contributorBaseName);
          InventorySearchAndFilter.verifyNumberOfSearchResults(6);
          InventoryInstances.checkSearchResultCount(/6 records found/);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedInstance1Title);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedInstance2Title);
          InventorySearchAndFilter.verifyInstanceDisplayed(sharedNearMissInstanceTitle);
          InventorySearchAndFilter.verifyInstanceDisplayed(localInstance1Title);
          InventorySearchAndFilter.verifyInstanceDisplayed(localSuppressedInstanceTitle);
          InventorySearchAndFilter.verifyInstanceDisplayed(localNearMissInstanceTitle);
          cy.wait(`@${fieldSearchAlias}`).then((interception) => {
            expect(decodeURIComponent(interception.request.url)).to.include(fuzzyOperatorText);
          });

          // Step 11-12: "Staff suppress" facet after the field search - neither option is
          // preselected, counters are 5 not suppressed / 1 suppressed
          cy.intercept('GET', '/search/instances/facets?facet=staffSuppress*').as(
            'getStaffSuppressFacetFromSearch',
          );
          InventorySearchAndFilter.toggleAccordionByName(staffSuppressAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            staffSuppressAccordionName,
            COMMON_BUTTON_LABELS.NO,
            false,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(
            staffSuppressAccordionName,
            COMMON_BUTTON_LABELS.YES,
            false,
          );
          InventorySearchAndFilter.verifyFilterOptionCount(
            staffSuppressAccordionName,
            COMMON_BUTTON_LABELS.NO,
            5,
          );
          InventorySearchAndFilter.verifyFilterOptionCount(
            staffSuppressAccordionName,
            COMMON_BUTTON_LABELS.YES,
            1,
          );
          cy.wait('@getStaffSuppressFacetFromSearch').then((interception) => {
            expect(decodeURIComponent(interception.request.url)).to.include(fuzzyOperatorText);
          });

          // Step 13: same representative Resource type facet check for the field search
          cy.intercept('GET', '/search/instances/facets?*').as('getResourceTypeFacetFromSearch');
          InventorySearchAndFilter.toggleAccordionByName(resourceTypeAccordionName);
          cy.wait('@getResourceTypeFacetFromSearch').then((interception) => {
            expect(decodeURIComponent(interception.request.url)).to.include(fuzzyOperatorText);
          });
        },
      );
    });
  });
});
