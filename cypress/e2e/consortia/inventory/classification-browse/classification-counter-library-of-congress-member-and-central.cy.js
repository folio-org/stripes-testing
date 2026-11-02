import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseClassifications from '../../../../support/fragments/inventory/search/browseClassifications';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../../support/fragments/settings/inventory/instances/classificationBrowse';
import ClassificationIdentifierTypes from '../../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import ClassificationIdentifierTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/instances/classificationIdentifierTypesConsortiumManager';
import {
  BROWSE_CLASSIFICATION_OPTIONS,
  INVENTORY_CLASSIFICATION_TYPES,
  CLASSIFICATION_IDENTIFIER_TYPES,
} from '../../../../support/constants';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

const randomPostfix = getRandomPostfix();
const instanceTitlePrefix = 'AT_C471480_FolioInstance';
// randomPostfix leads so this run's values sort apart from any stale/leftover data from a
// prior run that used the same literal "test00X." text (see C471478)
const classificationValue = `471480${randomPostfix.split('.')[1]}test005HD`;
const classificationBrowseId = defaultClassificationBrowseIdsAlgorithms[2].id; // 'lc'
const classificationBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[2].algorithm;
const sharedAccordionName = 'Shared';
const querySearchOption = 'Query search';
const searchQuery = `classifications.classificationNumber=="${classificationValue}"`;

// Classification identifier types created by this test
const localCentralTypeName = `AT_C471480_ClassifType_${randomPostfix}`;
const localMemberTypeName = `AT_C471480_ClassifType2_${randomPostfix}`;

// Every type below gets BOTH a Shared (Central) and a Local (Member) instance sharing the
// exact same classification value - this is the full noise/exclusion universe for this test.
// "Library of Congress classification" is configured (in the it() block) with [LC, LC
// (local), Local (created on Central)] - so the OTHER 7 standard types below + the
// Local-on-Member-only type are pure noise, never contributing to any row or Search-tab
// total (the click-redirect query filters by classificationTypeId too, scoped to whatever
// THIS browse option currently has configured in Settings - see C471479)
const allTypesWithPairs = [...Object.values(INVENTORY_CLASSIFICATION_TYPES), localCentralTypeName];
// The 3 types selected in "Library of Congress classification" settings for this test -
// every row AND every Search-tab click-through total in this test is scoped to just these 3
const lcTypes = [
  INVENTORY_CLASSIFICATION_TYPES.LC,
  INVENTORY_CLASSIFICATION_TYPES.LC_LOCAL,
  localCentralTypeName,
];
const lcTypeIndices = lcTypes.map((type) => allTypesWithPairs.indexOf(type));

// Expected {value, number} pairs for waitForClassificationNumberPairsToAppear - only the 3 LC
// rows are ever expected here
const memberExpectedPairs = lcTypes.map(() => ({ value: classificationValue, number: 2 }));
const centralExpectedPairs = lcTypes.map(() => ({ value: classificationValue, number: 1 }));

// Search-tab click-through totals - scoped to just the 3 LC types (the redirect query
// filters by classificationTypeId too, not just classificationNumber - see note above)
const allInstancesCount = lcTypes.length * 2; // Step 2: no Shared filter - shared+local halves of all 3 types
const localInstancesCount = lcTypes.length; // Step 5: Shared=No - local halves of all 3 types
const sharedInstancesCount = lcTypes.length; // Step 8/12: Shared=Yes - shared halves of all 3 types

// Preceding filler rows must use an LC-eligible type (LC) so they still appear as rows in
// THIS scoped browse view, keeping the row-offset for selectFoundValueByRow deterministic
// (see C471478 for why fixed offsets are needed at all)
const precedingValues = Array.from(
  { length: 5 },
  (_, i) => `471480${randomPostfix.split('.')[1]}test00${i}HD`,
);

let user;
let sharedType;
let localMemberTypeId;
const createdInstanceIds = [];
const sharedInstanceTitles = [];
const localInstanceTitles = [];
let localOnlyInstanceTitle;

function createClassificationInstance({
  tenant,
  title,
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
        InventoryInstances.deleteInstanceByTitleViaApi('C471480_');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('C471480_');

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

            allTypesWithPairs.forEach((typeName, index) => {
              const sharedTitle = `${instanceTitlePrefix}_Shared_${index}`;
              const localTitle = `${instanceTitlePrefix}_Local_${index}`;
              sharedInstanceTitles.push(sharedTitle);
              localInstanceTitles.push(localTitle);

              createClassificationInstance({
                tenant: Affiliations.Consortia,
                title: sharedTitle,
                typeName,
              });
              createClassificationInstance({
                tenant: Affiliations.College,
                title: localTitle,
                typeName,
              });
            });

            // Preceding filler rows - one shared+local pair per value, all typed "LC" so
            // they appear in the Library of Congress browse view
            precedingValues.forEach((value, index) => {
              createClassificationInstance({
                tenant: Affiliations.Consortia,
                title: `${instanceTitlePrefix}_PrecedingShared_${index}`,
                typeName: INVENTORY_CLASSIFICATION_TYPES.LC,
                classificationNumber: value,
              });
              createClassificationInstance({
                tenant: Affiliations.College,
                title: `${instanceTitlePrefix}_PrecedingLocal_${index}`,
                typeName: INVENTORY_CLASSIFICATION_TYPES.LC,
                classificationNumber: value,
              });
            });

            localOnlyInstanceTitle = `${instanceTitlePrefix}_LocalOnly`;
            cy.then(() => {
              createClassificationInstance({
                tenant: Affiliations.College,
                title: localOnlyInstanceTitle,
                typeName: localMemberTypeName,
              });
            });
          });
        });
      });

      after('Delete user, identifier types, instances, restore settings', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        // "Classification browse" identifier-type settings are consortium-wide, configured
        // once on Central and propagated to Member tenants - resetting it only on Central is
        // enough (see C471479)
        ClassificationBrowse.updateIdentifierTypesAPI(
          classificationBrowseId,
          classificationBrowseAlgorithm,
          [],
        );
        ClassificationIdentifierTypesConsortiumManager.deleteViaApi(sharedType);
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitlePrefix);
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi(instanceTitlePrefix);
        ClassificationIdentifierTypes.deleteViaApi(localMemberTypeId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C471480 Check "Number of titles" counter when different Instances have same classifications, from Member and Central tenant using "Library of Congress classification" option when only LC, LC (local) and Local are selected in settings (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'nonParallel', 'C471480'] },
        () => {
          // Non-default Settings are configured here (not in before()) so after() reliably
          // restores them to [] even if a step below fails partway through. Configured once
          // on Central only - it's a consortium-wide setting that propagates to Member
          // tenants (see C471479). Login happens AFTER this update, not before - the
          // frontend fetches the classification-browse settings once, right when Inventory
          // loads on login, so logging in first would make it search against stale/default
          // settings instead of the ones just configured
          cy.resetTenant();
          cy.getAdminToken(false);
          ClassificationIdentifierTypes.getIdByName(localCentralTypeName).then(
            (localCentralTypeId) => {
              ClassificationBrowse.updateIdentifierTypesAPI(
                classificationBrowseId,
                classificationBrowseAlgorithm,
                [
                  CLASSIFICATION_IDENTIFIER_TYPES.LC,
                  CLASSIFICATION_IDENTIFIER_TYPES.LC_LOCAL,
                  localCentralTypeId,
                ],
              );
            },
          );

          cy.setTenant(Affiliations.College);
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();

          // Step 1: browse "Library of Congress classification" for the shared value - 3
          // rows (LC, LC (local), Local created on Central) at counter 2 each (shared+local
          // pair); the other 8 types sharing this same value are correctly excluded
          // cy.getToken() re-anchors the token to this tenant/user - without it, the
          // okapiRequest calls below (waitForClassificationNumberToAppear) failed with 401
          cy.getToken(user.username, user.password);
          precedingValues.forEach((value) => {
            BrowseClassifications.waitForClassificationNumberToAppear(value);
          });
          BrowseClassifications.waitForClassificationNumberPairsToAppear(
            memberExpectedPairs,
            classificationBrowseId,
          );
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            BROWSE_CLASSIFICATION_OPTIONS.LIBRARY_OF_CONGRESS,
          );
          let searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.browseSearch(classificationValue);
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyRowsCount({
            classificationNumber: classificationValue,
            numberOfTitles: 2,
            expectedCount: lcTypes.length,
            isHighlighted: true,
          });

          // Step 2: click an exact match row - redirected to Query search. The redirect
          // query also filters by classificationTypeId here, scoped to the 3 types
          // configured for "Library of Congress classification" (see C471479)
          BrowseClassifications.selectFoundValueByRow(5, classificationValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifySearchOptionAndQuery(querySearchOption, searchQuery);
          InventorySearchAndFilter.verifyNumberOfSearchResults(allInstancesCount);
          InventorySearchAndFilter.checkSharedAndLocalInstancesInResultList();

          // Step 3: back to Browse - same results as step 1
          searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.switchToBrowseTab();
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyRowsCount({
            classificationNumber: classificationValue,
            numberOfTitles: 2,
            expectedCount: lcTypes.length,
            isHighlighted: true,
          });

          // Step 4: Shared facet -> "No" - only Local halves count, 3 rows at counter 1 each
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          lcTypeIndices.forEach((typeIndex) => {
            BrowseClassifications.verifyRowsCount({
              classificationNumber: classificationValue,
              title: localInstanceTitles[typeIndex],
              numberOfTitles: 1,
              expectedCount: 1,
              isHighlighted: true,
            });
          });

          // Step 5: click exact match - Local halves of the 3 LC types only
          BrowseClassifications.selectFoundValueByRow(5, classificationValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifySearchOptionAndQuery(querySearchOption, searchQuery);
          InventorySearchAndFilter.verifyNumberOfSearchResults(localInstancesCount);
          InventorySearchAndFilter.checkNoSharedInstancesInResultList();

          // Step 6: back to Browse - same results as step 4
          searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.switchToBrowseTab();
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);
          lcTypeIndices.forEach((typeIndex) => {
            BrowseClassifications.verifyRowsCount({
              classificationNumber: classificationValue,
              title: localInstanceTitles[typeIndex],
              numberOfTitles: 1,
              expectedCount: 1,
              isHighlighted: true,
            });
          });

          // Step 7: Shared facet -> uncheck "No", check "Yes" - only Shared halves count
          searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', false);
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          lcTypeIndices.forEach((typeIndex) => {
            BrowseClassifications.verifyRowsCount({
              classificationNumber: classificationValue,
              title: sharedInstanceTitles[typeIndex],
              numberOfTitles: 1,
              expectedCount: 1,
              isHighlighted: true,
            });
          });

          // Step 8: click exact match - Shared halves of the 3 LC types only
          BrowseClassifications.selectFoundValueByRow(5, classificationValue);
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
          BrowseClassifications.waitForClassificationNumberPairsToAppear(
            centralExpectedPairs,
            classificationBrowseId,
          );
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            BROWSE_CLASSIFICATION_OPTIONS.LIBRARY_OF_CONGRESS,
          );
          searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.browseSearch(classificationValue);
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyRowsCount({
            classificationNumber: classificationValue,
            numberOfTitles: 1,
            expectedCount: lcTypes.length,
            isHighlighted: true,
          });

          // Step 12: click exact match on Central - Shared halves of the 3 LC types only
          BrowseClassifications.selectFoundValueByRow(5, classificationValue);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifySearchOptionAndQuery(querySearchOption, searchQuery);
          InventorySearchAndFilter.verifyNumberOfSearchResults(sharedInstancesCount);
          InventorySearchAndFilter.checkSharedInstancesInResultList();
        },
      );
    });
  });
});
