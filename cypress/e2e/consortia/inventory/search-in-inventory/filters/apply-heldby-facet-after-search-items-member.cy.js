import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances, {
  searchItemsOptions,
} from '../../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import { INSTANCE_SOURCE_NAMES, ITEM_STATUS_NAMES } from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instancePrefix = `AT_C402359_Instance_${randomPostfix}`;
        const callNumberPrefix = `AT_C402359_CallNumber_${randomPostfix}`;
        const heldbyAccordionName = 'Held by';
        const searchOptions = {
          normalized: searchItemsOptions[5],
          notNormalized: searchItemsOptions[4],
        };
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
        const instanceIndexesHelbyCollegeAndUniversity = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .filter(({ item }) => item.holdingsAffiliations.includes(Affiliations.College))
          .filter(({ item }) => item.holdingsAffiliations.includes(Affiliations.University))
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
        let user;
        const locations = {
          [Affiliations.College]: null,
          [Affiliations.University]: null,
        };
        let holdingsSourceId;
        let loanTypeId;
        let materialTypeId;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402359');

          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
            .then((userProperties) => {
              user = userProperties;

              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402359');

              cy.setTenant(Affiliations.University);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402359');
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
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
                loanTypeId = loanTypes[0].id;
              });
              cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
                materialTypeId = res.id;
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
              instancesData.forEach((instanceData, instanceIndex) => {
                instanceData.holdingsAffiliations.forEach((holdingsAffiliation) => {
                  cy.setTenant(holdingsAffiliation);
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instanceData.instanceId,
                    permanentLocationId: locations[holdingsAffiliation].id,
                    sourceId: holdingsSourceId,
                  }).then((holding) => {
                    InventoryItems.createItemViaApi({
                      holdingsRecordId: holding.id,
                      materialType: { id: materialTypeId },
                      permanentLoanType: { id: loanTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      itemLevelCallNumber: `${callNumberPrefix} ${holdingsAffiliation} ${instanceIndex}`,
                    });
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
              InventorySearchAndFilter.switchToItem();
              InventorySearchAndFilter.itemTabIsDefault();
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
          'C402359 Use "Held by" facet when Search was executed in "Member" tenant ("Item" tab) (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C402359'] },
          () => {
            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
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

            InventorySearchAndFilter.selectSearchOption(searchOptions.normalized);
            InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.normalized);
            InventorySearchAndFilter.fillInSearchQuery(callNumberPrefix);
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

            InventorySearchAndFilter.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.university,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              true,
            );
            instanceIndexesHelbyUniversity.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyUniversity.length,
            );

            InventorySearchAndFilter.fillInSearchQuery(
              `${callNumberPrefix} ${Affiliations.College}`,
            );
            InventorySearchAndFilter.clickSearch();
            instanceIndexesHelbyCollegeAndUniversity.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyCollegeAndUniversity.length,
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
            instanceIndexesHelbyCollege.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyCollege.length,
            );

            InventorySearchAndFilter.fillInSearchQuery(
              `${callNumberPrefix} ${Affiliations.University}`,
            );
            InventorySearchAndFilter.clickSearch();
            instanceIndexesHelbyUniversity.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyUniversity.length,
            );

            InventorySearchAndFilter.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.university,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );
            instanceIndexesHelbyCollegeAndUniversity.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyCollegeAndUniversity.length,
            );

            InventorySearchAndFilter.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.university,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              true,
            );
            instanceIndexesHelbyUniversity.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyUniversity.length,
            );

            cy.intercept('/search/instances?*').as('getInstances');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.college,
            );
            cy.wait('@getInstances').its('response.statusCode').should('eq', 200);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );
            instanceIndexesHelbyUniversity.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyUniversity.length,
            );
          },
        );
      });
    });
  });
});
