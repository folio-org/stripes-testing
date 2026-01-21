import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import { INSTANCE_SOURCE_NAMES } from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instancePrefix = `AT_C402343_Instance_${randomPostfix}`;
        const heldbyAccordionName = 'Held by';
        const sharedAccordionName = 'Shared';
        const instancesData = [
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.College, Affiliations.University],
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.College],
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.University],
          },
          {
            affiliation: Affiliations.College,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.College],
          },
          {
            affiliation: Affiliations.University,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.University],
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.College, Affiliations.University],
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.College],
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.University],
          },
          {
            affiliation: Affiliations.College,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.College],
          },
          {
            affiliation: Affiliations.University,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.University],
          },
        ];
        const instanceTitles = Array.from(
          { length: instancesData.length },
          (_, i) => `${instancePrefix}_${i}`,
        );
        const instanceIndexesHelbyCollege = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .filter(({ item }) => item.holdingsAffiliations.includes(Affiliations.College))
          .map(({ index }) => index);
        const instanceIndexesHelbyUniversity = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .filter(({ item }) => item.holdingsAffiliations.includes(Affiliations.University))
          .map(({ index }) => index);
        const instanceIndexesAllVisibleInCollege = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .map(({ index }) => index);
        const instanceIndexesCollegeLocal = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation === Affiliations.College)
          .map(({ index }) => index);
        let user;
        const locations = {
          [Affiliations.College]: null,
          [Affiliations.University]: null,
        };
        let holdingsSourceId;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402343');

          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
            .then((userProperties) => {
              user = userProperties;

              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402343');

              cy.setTenant(Affiliations.University);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402343');
            })
            .then(() => {
              cy.resetTenant();
              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
                  instancesData.forEach((instanceData, index) => {
                    cy.setTenant(instanceData.affiliation);
                    if (instanceData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                      InventoryInstances.createFolioInstanceViaApi({
                        instance: {
                          instanceTypeId: instanceTypes[0].id,
                          title: `${instanceTitles[index]}`,
                        },
                      }).then((createdInstanceData) => {
                        instanceData.instanceId = createdInstanceData.instanceId;
                      });
                    } else {
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
                      ];

                      cy.createMarcBibliographicViaAPI(
                        QuickMarcEditor.defaultValidLdr,
                        marcInstanceFields,
                      ).then((instanceId) => {
                        instanceData.instanceId = instanceId;
                      });
                    }
                  });
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then((res) => {
                locations[Affiliations.College] = res;
              });
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                holdingsSourceId = folioSource.id;
              });
              cy.setTenant(Affiliations.University);
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then((res) => {
                locations[Affiliations.University] = res;
              });
            })
            .then(() => {
              instancesData.forEach((instanceData) => {
                instanceData.holdingsAffiliations.forEach((holdingsAffiliation) => {
                  cy.setTenant(holdingsAffiliation);
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instanceData.instanceId,
                    permanentLocationId: locations[holdingsAffiliation].id,
                    sourceId: holdingsSourceId,
                  });
                });
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

          cy.setTenant(Affiliations.University);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

          cy.resetTenant();
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        });

        it(
          'C402343 Apply "Held by" facet when "No" is selected in "Shared" facet (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C402343'] },
          () => {
            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
            InventorySearchAndFilter.clickAccordionByName(heldbyAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(heldbyAccordionName, true);
            InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(heldbyAccordionName);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );

            InventorySearchAndFilter.fillInSearchQuery(instancePrefix);
            InventorySearchAndFilter.clickSearch();
            instanceIndexesAllVisibleInCollege.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesAllVisibleInCollege.length,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              heldbyAccordionName,
              tenantNames.college,
              instanceIndexesHelbyCollege.length,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              heldbyAccordionName,
              tenantNames.university,
              instanceIndexesHelbyUniversity.length,
            );

            InventorySearchAndFilter.clickAccordionByName(sharedAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName, true);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);
            instanceIndexesCollegeLocal.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesCollegeLocal.length,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              heldbyAccordionName,
              tenantNames.college,
              instanceIndexesCollegeLocal.length,
            );
            InventorySearchAndFilter.verifyOptionAvailableMultiselect(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );

            InventorySearchAndFilter.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.college,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );
            instanceIndexesCollegeLocal.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesCollegeLocal.length,
            );

            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
            InventorySearchAndFilter.verifyResultPaneEmpty();
            InventorySearchAndFilter.checkSearchQueryText('');
            InventorySearchAndFilter.verifyAccordionExistance(heldbyAccordionName);
            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);

            InventorySearchAndFilter.fillInSearchQuery(instancePrefix);
            InventorySearchAndFilter.clickSearch();
            instanceIndexesAllVisibleInCollege.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesAllVisibleInCollege.length,
            );
            InventorySearchAndFilter.clickAccordionByName(heldbyAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(heldbyAccordionName, true);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              heldbyAccordionName,
              tenantNames.college,
              instanceIndexesHelbyCollege.length,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              heldbyAccordionName,
              tenantNames.university,
              instanceIndexesHelbyUniversity.length,
            );
            InventorySearchAndFilter.clickAccordionByName(sharedAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName, true);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);
            instanceIndexesCollegeLocal.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesCollegeLocal.length,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              heldbyAccordionName,
              tenantNames.college,
              instanceIndexesCollegeLocal.length,
            );
            InventorySearchAndFilter.verifyOptionAvailableMultiselect(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );

            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            InventorySearchAndFilter.verifyResultPaneEmpty();
            InventorySearchAndFilter.checkSearchQueryText('');
            InventorySearchAndFilter.verifyAccordionExistance(heldbyAccordionName);
            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);

            InventorySearchAndFilter.fillInSearchQuery(instancePrefix);
            InventorySearchAndFilter.clickSearch();
            instanceIndexesAllVisibleInCollege.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesAllVisibleInCollege.length,
            );
            InventorySearchAndFilter.clickAccordionByName(heldbyAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(heldbyAccordionName, true);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              heldbyAccordionName,
              tenantNames.college,
              instanceIndexesHelbyCollege.length,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              heldbyAccordionName,
              tenantNames.university,
              instanceIndexesHelbyUniversity.length,
            );
            InventorySearchAndFilter.clickAccordionByName(sharedAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName, true);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);
            instanceIndexesCollegeLocal.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesCollegeLocal.length,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              heldbyAccordionName,
              tenantNames.college,
              instanceIndexesCollegeLocal.length,
            );
            InventorySearchAndFilter.verifyOptionAvailableMultiselect(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );
          },
        );
      });
    });
  });
});
