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
const instanceTitlePrefix = `AT_C471479_FolioInstance_${randomPostfix}`;
// randomPostfix leads so this run's values sort apart from any stale/leftover data from a
// prior run that used the same literal "test00X." text (see C471478)
const classificationValue = `471479${randomPostfix.split('.')[1]}test005HD`;
const classificationBrowseId = defaultClassificationBrowseIdsAlgorithms[1].id; // 'dewey'
const classificationBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[1].algorithm;
const sharedAccordionName = 'Shared';
const querySearchOption = 'Query search';
const searchQuery = `classifications.classificationNumber=="${classificationValue}"`;

// Classification identifier types created by this test
const localCentralTypeName = `AT_C471479_ClassifType_${randomPostfix}`;
const localMemberTypeName = `AT_C471479_ClassifType2_${randomPostfix}`;

// Every type below gets BOTH a Shared (Central) and a Local (Member) instance sharing the
// exact same classification value - this is purely the noise/exclusion universe for THIS
// test. Whether the click-redirect query includes a classificationTypeId filter depends on
// whether the CLICKED browse option currently has any identifier types configured in
// Settings - even "Classification (all)" would filter by type if given some (it just has
// none in C471478, which is why that test's redirect query is type-blind). Here "Dewey
// Decimal classification" is configured with [Dewey, Additional Dewey], so its redirect
// query bakes those 2 types in (confirmed live:
// "classifications.classificationNumber==... and (classificationTypeId==DEWEY or
// classificationTypeId==ADDITIONAL_DEWEY)"), so the other 9 types below never contribute to
// ANY count in this test - not the browse rows, and not the Search-tab totals either
const allTypesWithPairs = [...Object.values(INVENTORY_CLASSIFICATION_TYPES), localCentralTypeName];
// Only these 2 are selected in "Dewey Decimal classification" settings for this test - every
// row AND every Search-tab click-through total in this test is scoped to just these 2 types
const deweyDecimalTypes = [
  INVENTORY_CLASSIFICATION_TYPES.DEWEY,
  INVENTORY_CLASSIFICATION_TYPES.ADDITIONAL_DEWEY,
];
const deweyDecimalTypeIndices = deweyDecimalTypes.map((type) => allTypesWithPairs.indexOf(type));

// Expected {value, number} pairs for waitForClassificationNumberPairsToAppear - only the 2
// Dewey Decimal rows are ever expected here, unlike C471478's full 12-row wait
const memberExpectedPairs = deweyDecimalTypes.map(() => ({
  value: classificationValue,
  number: 2,
}));
const centralExpectedPairs = deweyDecimalTypes.map(() => ({
  value: classificationValue,
  number: 1,
}));

// Search-tab click-through totals - scoped to just the 2 Dewey Decimal types (the redirect
// query filters by classificationTypeId too, not just classificationNumber - see note above)
const allInstancesCount = deweyDecimalTypes.length * 2; // Step 2: no Shared filter - shared+local halves of both types
const localInstancesCount = deweyDecimalTypes.length; // Step 5: Shared=No - local halves of both types
const sharedInstancesCount = deweyDecimalTypes.length; // Step 8/12: Shared=Yes - shared halves of both types

// Preceding filler rows must use a Dewey Decimal-eligible type (Dewey) so they still appear
// as rows in THIS scoped browse view, keeping the row-offset for selectFoundValueByRow
// deterministic (see C471478 for why fixed offsets are needed at all)
const precedingValues = Array.from(
  { length: 5 },
  (_, i) => `471479${randomPostfix.split('.')[1]}test00${i}HD`,
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
        InventoryInstances.deleteInstanceByTitleViaApi('C471479_');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('C471479_');

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

            // Preceding filler rows - one shared+local pair per value, all typed "Dewey" so
            // they appear in the Dewey Decimal browse view
            precedingValues.forEach((value, index) => {
              createClassificationInstance({
                tenant: Affiliations.Consortia,
                title: `${instanceTitlePrefix}_PrecedingShared_${index}`,
                typeName: INVENTORY_CLASSIFICATION_TYPES.DEWEY,
                classificationNumber: value,
              });
              createClassificationInstance({
                tenant: Affiliations.College,
                title: `${instanceTitlePrefix}_PrecedingLocal_${index}`,
                typeName: INVENTORY_CLASSIFICATION_TYPES.DEWEY,
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
        'C471479 Check "Number of titles" counter when different Instances have same classifications, from Member and Central tenant using "Dewey Decimal classification" option when only Dewey and Additional Dewey are selected in settings (consortia) (promin)',
        { tags: ['criticalPathECS', 'promin', 'nonParallel', 'C471479'] },
        () => {
          cy.resetTenant();
          cy.getAdminToken(false);
          ClassificationBrowse.updateIdentifierTypesAPI(
            classificationBrowseId,
            classificationBrowseAlgorithm,
            [
              CLASSIFICATION_IDENTIFIER_TYPES.DEWEY,
              CLASSIFICATION_IDENTIFIER_TYPES.ADDITIONAL_DEWEY,
            ],
          );

          cy.setTenant(Affiliations.College);
          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();

          // Step 1: browse "Dewey Decimal classification" for the shared value - 2 rows
          // (Dewey, Additional Dewey) at counter 2 each (shared+local pair); the other 9 types
          // sharing this same value are correctly excluded from this scoped browse option
          cy.getToken(user.username, user.password);
          precedingValues.forEach((value) => {
            BrowseClassifications.waitForClassificationNumberToAppear(value);
          });
          BrowseClassifications.waitForClassificationNumberPairsToAppear(
            memberExpectedPairs,
            classificationBrowseId,
          );
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
          );
          let searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.browseSearch(classificationValue);
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyRowsCount({
            classificationNumber: classificationValue,
            numberOfTitles: 2,
            expectedCount: deweyDecimalTypes.length,
            isHighlighted: true,
          });

          // Step 2: click an exact match row - redirected to Query search. The redirect
          // query also filters by classificationTypeId here, since "Dewey Decimal
          // classification" has types configured in Settings (unlike C471478's
          // "Classification (all)", which has none, so its own redirect stays type-blind) -
          // so the result count is just the 2 Dewey Decimal types' shared+local halves, not
          // the full noise universe
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
            expectedCount: deweyDecimalTypes.length,
            isHighlighted: true,
          });

          // Step 4: Shared facet -> "No" - only Local halves count, 2 rows at counter 1 each
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          deweyDecimalTypeIndices.forEach((typeIndex) => {
            BrowseClassifications.verifyRowsCount({
              classificationNumber: classificationValue,
              title: localInstanceTitles[typeIndex],
              numberOfTitles: 1,
              expectedCount: 1,
              isHighlighted: true,
            });
          });

          // Step 5: click exact match - Local halves of the 2 Dewey Decimal types only
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
          deweyDecimalTypeIndices.forEach((typeIndex) => {
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
          deweyDecimalTypeIndices.forEach((typeIndex) => {
            BrowseClassifications.verifyRowsCount({
              classificationNumber: classificationValue,
              title: sharedInstanceTitles[typeIndex],
              numberOfTitles: 1,
              expectedCount: 1,
              isHighlighted: true,
            });
          });

          // Step 8: click exact match - Shared halves of the 2 Dewey Decimal types only
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

          // Step 11: same search on Central - only Shared instances count (Central never sees
          // Member-local instances)
          cy.resetTenant();
          precedingValues.forEach((value) => {
            BrowseClassifications.waitForClassificationNumberToAppear(value);
          });
          BrowseClassifications.waitForClassificationNumberPairsToAppear(
            centralExpectedPairs,
            classificationBrowseId,
          );
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
          );
          searchAlias = BrowseClassifications.interceptClassificationNumbersApi();
          InventorySearchAndFilter.browseSearch(classificationValue);
          BrowseClassifications.waitForBrowseResultsToLoad(searchAlias);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyRowsCount({
            classificationNumber: classificationValue,
            numberOfTitles: 1,
            expectedCount: deweyDecimalTypes.length,
            isHighlighted: true,
          });

          // Step 12: click exact match on Central - Shared halves of the 2 Dewey Decimal
          // types only (Central never sees Local instances anyway, and the redirect query
          // also excludes the 9 other noise types regardless of Shared/Local)
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
