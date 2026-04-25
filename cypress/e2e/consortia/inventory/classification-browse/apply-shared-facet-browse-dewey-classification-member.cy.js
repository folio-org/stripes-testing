import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  BROWSE_CLASSIFICATION_OPTIONS,
  CLASSIFICATION_IDENTIFIER_TYPES,
} from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import BrowseClassifications from '../../../../support/fragments/inventory/search/browseClassifications';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import ClassificationBrowse, {
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../../support/fragments/settings/inventory/instances/classificationBrowse';

describe('Inventory', () => {
  describe('Instance classification browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C471473_MarcBibInstance_${randomPostfix}`;
      const classificationPrefix = `AT_C471473_Classification_${randomPostfix}`;
      const sharedAccordionName = 'Shared';
      const querySearchOption = 'Query search';
      const classificationBrowseId = defaultClassificationBrowseIdsAlgorithms[1].id; // 'dewey'
      const classificationBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[1].algorithm;
      const tags = {
        tag008: '008',
        tag245: '245',
        tag082: '082',
      };

      const instancesData = [
        {
          affiliation: Affiliations.Consortia,
        },
        {
          affiliation: Affiliations.College,
        },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const classificationValues = Array.from(
        { length: instancesData.length },
        (_, i) => `${classificationPrefix}_${i}`,
      );

      let user;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C471473');
          })
          .then(() => {
            cy.resetTenant();
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewInstances.gui,
            ]);
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C471473');

            instancesData.forEach((instanceData, index) => {
              cy.setTenant(instanceData.affiliation);

              const marcInstanceFields = [
                {
                  tag: tags.tag008,
                  content: QuickMarcEditor.defaultValid008Values,
                },
                {
                  tag: tags.tag245,
                  content: `$a ${instanceTitles[index]}`,
                  indicators: ['1', '1'],
                },
                {
                  tag: tags.tag082,
                  content: `$a ${classificationValues[index]}`,
                  indicators: ['0', '4'],
                },
              ];
              cy.createMarcBibliographicViaAPI(
                QuickMarcEditor.defaultValidLdr,
                marcInstanceFields,
              ).then((instanceId) => {
                instanceData.instanceId = instanceId;
              });
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            ClassificationBrowse.updateIdentifierTypesAPI(
              classificationBrowseId,
              classificationBrowseAlgorithm,
              [CLASSIFICATION_IDENTIFIER_TYPES.DEWEY],
            );

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);

        cy.setTenant(Affiliations.College);
        ClassificationBrowse.updateIdentifierTypesAPI(
          classificationBrowseId,
          classificationBrowseAlgorithm,
          [],
        );
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);
      });

      it(
        'C471473 Apply "Shared" facet to browse classifications result list during browsing by "Dewey Decimal classification" option when Dewey is selected in settings (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C471473'] },
        () => {
          classificationValues.forEach((classification) => {
            BrowseClassifications.waitForClassificationNumberToAppear(
              classification,
              classificationBrowseId,
            );
          });

          // Step 1: Select "Dewey Decimal classification", browse for shared classification
          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            BROWSE_CLASSIFICATION_OPTIONS.DEWEY_DECIMAL,
          );
          InventorySearchAndFilter.browseSearch(classificationValues[0]);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);

          // Step 2: Expand "Shared" accordion and verify checkboxes
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          // Step 3: Check "Yes" checkbox - only shared classification displayed
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
          InventorySearchAndFilter.verifyBrowseResultListExists();
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          BrowseContributors.checkValueAbsentInResults(classificationValues[1]);

          // Step 4: Click on shared classification - redirected to search
          BrowseClassifications.selectFoundValueByValue(classificationValues[0]);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifySearchOptionAndQuery(
            querySearchOption,
            `classifications.classificationNumber=="${classificationValues[0]}"`,
          );
          InventorySearchAndFilter.checkSharedInstancesInResultList();
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);

          // Step 5: Return to browse - same results as step 3
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          BrowseContributors.checkValueAbsentInResults(classificationValues[1]);

          // Step 6: Uncheck "Yes" - both classifications displayed
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes', false);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          // Step 7: Check "No" - only local classification displayed
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          BrowseContributors.checkValueAbsentInResults(classificationValues[0]);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

          // Step 8: Click on local classification - redirected to search
          BrowseClassifications.selectFoundValueByValue(classificationValues[1]);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifySearchOptionAndQuery(
            querySearchOption,
            `classifications.classificationNumber=="${classificationValues[1]}"`,
          );
          InventorySearchAndFilter.checkNoSharedInstancesInResultList();
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

          // Step 9: Return to browse - same results as step 7
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);
          BrowseContributors.checkValueAbsentInResults(classificationValues[0]);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);

          // Step 10: Uncheck "No" - both classifications displayed
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', false);
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          // Step 11: Check both "Yes" and "No" - both classifications displayed
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);

          // Step 12: Click on any result - redirected to search with both checkboxes
          BrowseClassifications.selectFoundValueByValue(classificationValues[0]);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifySearchOptionAndQuery(
            querySearchOption,
            `classifications.classificationNumber=="${classificationValues[0]}"`,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

          // Step 13: Return to browse - same results as step 11
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);

          // Step 14: Uncheck both checkboxes - both classifications still displayed
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);
        },
      );
    });
  });
});
