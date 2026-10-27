import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseClassifications from '../../../../support/fragments/inventory/search/browseClassifications';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../../support/fragments/settings/inventory/instances/classificationBrowse';
import ClassificationIdentifierTypes from '../../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import ClassificationIdentifierTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/instances/classificationIdentifierTypesConsortiumManager';
import {
  BROWSE_CLASSIFICATION_OPTIONS,
  INVENTORY_CLASSIFICATION_TYPES,
} from '../../../../support/constants';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

const randomPostfix = getRandomPostfix();
const instanceTitlePrefix = 'AT_C471478_FolioInstance';
// randomPostfix leads so this run's values sort apart from any stale/leftover data from a
// prior run that used the same literal "test00X." text - if the postfix were a trailing
// suffix instead, such leftovers would still fall into the same "test00X." sort bucket and
// could interleave with our rows, breaking the fixed row-index assumptions below
const classificationValue = `471478${randomPostfix.split('.')[1]}test005. HD`;
const classificationBrowseId = defaultClassificationBrowseIdsAlgorithms[0].id; // 'all'
const classificationBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[0].algorithm;
const sharedAccordionName = 'Shared';
const querySearchOption = 'Query search';
const searchQuery = `classifications.classificationNumber=="${classificationValue}"`;

// Classification identifier types created by this test
const localCentralTypeName = `AT_C471478_ClassifType_${randomPostfix}`;
const localMemberTypeName = `AT_C471478_ClassifType2_${randomPostfix}`;

// The 11 identifier types that get BOTH a Shared (Central) and a Local (Member) instance,
// all sharing the exact same classification value - this is what the test's "Number of
// titles" = 2 counter claim depends on. localCentralTypeName is resolved via getIdByName
// too since consortium-manager-created types propagate to member tenants with the same id.
const pairedTypes = [...Object.values(INVENTORY_CLASSIFICATION_TYPES), localCentralTypeName];
// Representative row used for the title/contributor-specific checks in steps 4/5/7/8 -
// checking all 11 individually would just repeat the same assertions 11 times
const representativeTypeIndex = 0;

// Expected {value, number} pairs for waitForClassificationNumbersToAppear - waiting for the
// exact multiset of counters (not just "the value exists") avoids proceeding while only some
// of the 12 rows have finished indexing
const memberExpectedPairs = [
  ...pairedTypes.map(() => ({ value: classificationValue, number: 2 })),
  { value: classificationValue, number: 1 },
];
const centralExpectedPairs = pairedTypes.map(() => ({ value: classificationValue, number: 1 }));

// TestRail steps 2/5/8: "Number of found Instance records matches to the sum of values in
// 'Number of titles' column from the Browse result list for exact match Classification" - the
// search query filters only by classificationNumber (not type), so the total is always the sum
// across every row sharing classificationValue, not just whatever row happened to be clicked
const allInstancesCount = pairedTypes.length * 2 + 1; // Step 2: no Shared filter active
const localInstancesCount = pairedTypes.length + 1; // Step 5: Shared=No - local halves + local-only
const sharedInstancesCount = pairedTypes.length; // Step 8: Shared=Yes - shared halves only

// Browse results aren't filtered to exact matches - they show a sorted neighborhood around
// the searched value, so unrelated pre-existing data normally pushes our target rows a few
// positions down (commonly to index 5). Rather than rely on that, create 5 values that sort
// right before classificationValue ourselves, each with a shared+local pair so they stay
// visible across every Shared-facet filter state too, making the offset deterministic.
const precedingValues = Array.from(
  { length: 5 },
  (_, i) => `471478${randomPostfix.split('.')[1]}test00${i}. HD`,
);

let user;
let sharedType;
let localMemberTypeId;
let contributorNameTypeId;
const createdInstanceIds = [];
const sharedInstanceTitles = [];
const localInstanceTitles = [];
const sharedContributorNames = [];
const localContributorNames = [];
let localOnlyInstanceTitle;
let localOnlyContributorName;

function createClassificationInstance({
  tenant,
  title,
  contributorName,
  typeName,
  classificationNumber = classificationValue,
}) {
  cy.setTenant(tenant);
  return cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
    const instanceTypeId = instanceTypes[0].id;
    return ClassificationIdentifierTypes.getIdByName(typeName).then((classificationTypeId) => {
      return InventoryInstances.createFolioInstanceViaApi({
        instance: {
          instanceTypeId,
          title,
          classifications: [{ classificationTypeId, classificationNumber }],
          contributors: [
            {
              name: contributorName,
              contributorNameTypeId,
              contributorTypeText: '',
              primary: false,
            },
          ],
        },
      }).then((instance) => {
        createdInstanceIds.push(instance.instanceId);
      });
    });
  });
}

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    describe('Consortia', () => {
      before('Create user, identifier types, instances', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C471478_');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('C471478_');

        // User created in College (member) so it logs in there directly (ECS skill Pattern 1)
        cy.setTenant(Affiliations.College);
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((createdUser) => {
          user = createdUser;

          cy.resetTenant();
          cy.assignPermissionsToExistingUser(user.userId, [
            Permissions.uiInventoryViewInstances.gui,
          ]);

          // Create the Shared ("Local created on Central tenant") identifier type
          ClassificationIdentifierTypesConsortiumManager.createViaApi({
            payload: { name: localCentralTypeName },
          }).then((shared) => {
            sharedType = shared;

            // Create the Member-only ("Local created on Member tenant") identifier type
            cy.setTenant(Affiliations.College);
            ClassificationIdentifierTypes.createViaApi({
              name: localMemberTypeName,
              source: 'local',
            }).then((response) => {
              localMemberTypeId = response.body.id;
            });

            BrowseContributors.getContributorNameTypes({ searchParams: { limit: 1 } }).then(
              (nameTypes) => {
                contributorNameTypeId = nameTypes[0].id;

                pairedTypes.forEach((typeName, index) => {
                  const sharedTitle = `${instanceTitlePrefix}_Shared_${index}`;
                  const localTitle = `${instanceTitlePrefix}_Local_${index}`;
                  const sharedContributor = `${instanceTitlePrefix}_Contributor_Shared_${index}`;
                  const localContributor = `${instanceTitlePrefix}_Contributor_Local_${index}`;
                  sharedInstanceTitles.push(sharedTitle);
                  localInstanceTitles.push(localTitle);
                  sharedContributorNames.push(sharedContributor);
                  localContributorNames.push(localContributor);

                  createClassificationInstance({
                    tenant: Affiliations.Consortia,
                    title: sharedTitle,
                    contributorName: sharedContributor,
                    typeName,
                  });
                  createClassificationInstance({
                    tenant: Affiliations.College,
                    title: localTitle,
                    contributorName: localContributor,
                    typeName,
                  });
                });

                // Preceding filler rows - one shared+local pair per value, reusing the first
                // paired type since the row's sort position only depends on the classification
                // number text, not its type
                precedingValues.forEach((value, index) => {
                  createClassificationInstance({
                    tenant: Affiliations.Consortia,
                    title: `${instanceTitlePrefix}_PrecedingShared_${index}`,
                    contributorName: `${instanceTitlePrefix}_Contributor_PrecedingShared_${index}`,
                    typeName: pairedTypes[0],
                    classificationNumber: value,
                  });
                  createClassificationInstance({
                    tenant: Affiliations.College,
                    title: `${instanceTitlePrefix}_PrecedingLocal_${index}`,
                    contributorName: `${instanceTitlePrefix}_Contributor_PrecedingLocal_${index}`,
                    typeName: pairedTypes[0],
                    classificationNumber: value,
                  });
                });

                localOnlyInstanceTitle = `${instanceTitlePrefix}_LocalOnly`;
                localOnlyContributorName = `${instanceTitlePrefix}_Contributor_LocalOnly`;
                cy.then(() => {
                  createClassificationInstance({
                    tenant: Affiliations.College,
                    title: localOnlyInstanceTitle,
                    contributorName: localOnlyContributorName,
                    typeName: localMemberTypeName,
                  });
                });
              },
            );
          });
        });

        cy.then(() => {
          // Ensure "Classification (all)" browse has no selected identifier types, on both tenants
          cy.resetTenant();
          ClassificationBrowse.updateIdentifierTypesAPI(
            classificationBrowseId,
            classificationBrowseAlgorithm,
            [],
          );
          cy.setTenant(Affiliations.College);
          ClassificationBrowse.updateIdentifierTypesAPI(
            classificationBrowseId,
            classificationBrowseAlgorithm,
            [],
          );

          cy.setTenant(Affiliations.College);
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
        });
      });

      after('Delete user, identifier types, instances', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        ClassificationIdentifierTypesConsortiumManager.deleteViaApi(sharedType);
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitlePrefix);
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitlePrefix);
        ClassificationIdentifierTypes.deleteViaApi(localMemberTypeId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C471478 Check "Number of titles" counter when different Instances have same classifications, from Member and Central tenant using "Classification (all)" option when settings are empty (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'C471478'] },
        () => {
          // Step 1: browse "Classification (all)" for the shared value - 11 rows at counter 2
          // (shared+local pair), 1 row at counter 1 (local-only type), Title/Contributors empty
          precedingValues.forEach((value) => {
            BrowseClassifications.waitForClassificationNumberToAppear(value);
          });
          BrowseClassifications.waitForClassificationNumberPairsToAppear(memberExpectedPairs);
          InventorySearchAndFilter.selectBrowseOption(
            BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
          );
          let searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.browseSearch(classificationValue);
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyRowsCount({
            classificationNumber: classificationValue,
            numberOfTitles: 2,
            expectedCount: pairedTypes.length,
            isHighlighted: true,
          });
          BrowseClassifications.verifyRowsCount({
            classificationNumber: classificationValue,
            numberOfTitles: 1,
            expectedCount: 1,
            isHighlighted: true,
          });

          // Step 2: click the exact match result - redirected to Query search with the
          // classification query. Multiple rows share identical displayed text (same value,
          // different identifier types), so clicking targets the first matching row rather
          // than a specific type, but the query itself filters only by classificationNumber
          // (not type), so the result count is always the full sum regardless of which row
          // was clicked
          BrowseClassifications.selectFoundValueByRow(5, classificationValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifySearchOptionAndQuery(querySearchOption, searchQuery);
          InventorySearchAndFilter.verifyNumberOfSearchResults(allInstancesCount);
          InventorySearchAndFilter.checkSharedAndLocalInstancesInResultList();

          // Step 3: back to Browse - same results as step 1. Switching back re-fetches, so
          // wait for that response too before reading rows
          searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.switchToBrowseTab();
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyRowsCount({
            classificationNumber: classificationValue,
            numberOfTitles: 2,
            expectedCount: pairedTypes.length,
            isHighlighted: true,
          });
          BrowseClassifications.verifyRowsCount({
            classificationNumber: classificationValue,
            numberOfTitles: 1,
            expectedCount: 1,
            isHighlighted: true,
          });

          // Step 4: Shared facet -> "No" - only Local instances count (representative type
          // only; all 11 paired types behave the same way)
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          BrowseClassifications.verifyRowsCount({
            classificationNumber: classificationValue,
            title: localInstanceTitles[representativeTypeIndex],
            contributors: localContributorNames[representativeTypeIndex],
            numberOfTitles: 1,
            expectedCount: 1,
            isHighlighted: true,
          });

          // Step 5: click exact match - Local instances only. Still 5 preceding filler rows
          // (local halves) at indices 0-4, so target rows are still 5-16 - pick a different
          // index than step 2 for variety
          BrowseClassifications.selectFoundValueByRow(10, classificationValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifySearchOptionAndQuery(querySearchOption, searchQuery);
          InventorySearchAndFilter.verifyNumberOfSearchResults(localInstancesCount);
          InventorySearchAndFilter.checkNoSharedInstancesInResultList();

          // Step 6: back to Browse - same results as step 4. Switching back re-fetches, so
          // wait for that response too before reading rows
          searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.switchToBrowseTab();
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);
          BrowseClassifications.verifyRowsCount({
            classificationNumber: classificationValue,
            title: localInstanceTitles[representativeTypeIndex],
            contributors: localContributorNames[representativeTypeIndex],
            numberOfTitles: 1,
            expectedCount: 1,
            isHighlighted: true,
          });

          // Step 7: Shared facet -> uncheck "No", check "Yes" - only Shared instances count.
          // Each checkbox change re-triggers its own search, so wait for each response in turn
          // rather than once at the end, to avoid reading rows against the stale intermediate one
          searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', false);
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          BrowseClassifications.verifyRowsCount({
            classificationNumber: classificationValue,
            title: sharedInstanceTitles[representativeTypeIndex],
            contributors: sharedContributorNames[representativeTypeIndex],
            numberOfTitles: 1,
            expectedCount: 1,
            isHighlighted: true,
          });

          // Step 8: click exact match - Shared instances only. 5 preceding filler rows
          // (shared halves) at indices 0-4, target rows (only 11, no local-only type) at 5-15 -
          // pick the last valid index for variety
          BrowseClassifications.selectFoundValueByRow(15, classificationValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifySearchOptionAndQuery(querySearchOption, searchQuery);
          InventorySearchAndFilter.verifyNumberOfSearchResults(sharedInstancesCount);
          InventorySearchAndFilter.checkSharedInstancesInResultList();

          // Step 9: switch active affiliation to Central tenant
          InventorySearchAndFilter.switchToBrowseTab();
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);

          // Step 10: Browse tab is selected on Central
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();

          // Step 11: same search on Central - only Shared instances count (Central never
          // sees Member-local instances)
          cy.resetTenant();
          precedingValues.forEach((value) => {
            BrowseClassifications.waitForClassificationNumberToAppear(value);
          });
          BrowseClassifications.waitForClassificationNumberPairsToAppear(centralExpectedPairs);
          InventorySearchAndFilter.selectBrowseOption(
            BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
          );
          searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.browseSearch(classificationValue);
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyRowsCount({
            classificationNumber: classificationValue,
            numberOfTitles: 1,
            expectedCount: pairedTypes.length,
            isHighlighted: true,
          });
          BrowseClassifications.verifyRowsCount({
            classificationNumber: classificationValue,
            title: sharedInstanceTitles[representativeTypeIndex],
            contributors: sharedContributorNames[representativeTypeIndex],
            numberOfTitles: 1,
            expectedCount: 1,
            isHighlighted: true,
          });
        },
      );
    });
  });
});
