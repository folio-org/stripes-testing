import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  INSTANCE_SOURCE_NAMES,
  BROWSE_CLASSIFICATION_OPTIONS,
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
      const instancePrefix = `AT_C471471_Instance_${randomPostfix}`;
      const classificationPrefix = `AT_C471471_Classification_${randomPostfix}`;
      const sharedAccordionName = 'Shared';
      const querySearchOption = 'Query search';
      const classificationBrowseId = defaultClassificationBrowseIdsAlgorithms[0].id; // 'all'
      const classificationBrowseAlgorithm = defaultClassificationBrowseIdsAlgorithms[0].algorithm;
      const instancesData = [
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
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
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C471471');
          })
          .then(() => {
            cy.resetTenant();
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewInstances.gui,
            ]);
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C471471');

            instancesData.forEach((instanceData, index) => {
              cy.setTenant(instanceData.affiliation);

              const marcInstanceFields = [
                {
                  tag: '008',
                  content: QuickMarcEditor.defaultValid008Values,
                },
                {
                  tag: '245',
                  content: `$a ${instanceTitles[index]}`,
                  indicators: ['1', '1'],
                },
                {
                  tag: '050',
                  content: `$a ${classificationValues[index]}`,
                  indicators: ['\\', '4'],
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
              [],
            );

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);

        cy.resetTenant();
        InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);
      });

      it(
        'C471471 Apply "Shared" facet to browse classifications result list during browsing by "Classification (all)" option when settings are empty (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C471471'] },
        () => {
          classificationValues.forEach((classification) => {
            BrowseClassifications.waitForClassificationNumberToAppear(classification);
          });

          InventorySearchAndFilter.selectBrowseOption(
            BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.browseSearch(classificationValues[0]);
          BrowseClassifications.verifySearchResultsTable();
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);

          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
          InventorySearchAndFilter.verifyBrowseResultListExists();
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          BrowseContributors.checkValueAbsentInResults(classificationValues[1]);

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

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          BrowseContributors.checkValueAbsentInResults(classificationValues[1]);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes', false);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          BrowseContributors.checkValueAbsentInResults(classificationValues[0]);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

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

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);
          BrowseContributors.checkValueAbsentInResults(classificationValues[0]);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', false);
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);

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

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);
          BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValues[0]);
          BrowseContributors.checkRecordPresentInSearchResults(classificationValues[1]);

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
