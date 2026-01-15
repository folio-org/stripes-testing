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
        const instancePrefix = `AT_C404405_Instance_${randomPostfix}`;
        const sourceAccordionName = 'Source';
        const heldbyAccordionName = 'Held by';
        const instancesData = [
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.Consortia,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.Consortia,
            holdingsAffiliation: Affiliations.College,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.Consortia,
            holdingsAffiliation: Affiliations.University,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.Consortia,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.Consortia,
            holdingsAffiliation: Affiliations.College,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.Consortia,
            holdingsAffiliation: Affiliations.University,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.College,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.College,
            holdingsAffiliation: Affiliations.College,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.College,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.College,
            holdingsAffiliation: Affiliations.College,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.University,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.University,
            holdingsAffiliation: Affiliations.University,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.University,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.University,
            holdingsAffiliation: Affiliations.University,
          },
        ];
        const instanceTitles = instancesData.map(
          (instanceData, index) => `${instancePrefix} ${instanceData.instanceSource} ${index}`,
        );
        const allVisibleInstanceIndexes = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .map(({ index }) => index);
        const visibleMarcInstanceIndexes = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .filter(({ item }) => item.instanceSource === INSTANCE_SOURCE_NAMES.MARC)
          .map(({ index }) => index);
        const visibleFolioInstanceIndexes = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .filter(({ item }) => item.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO)
          .map(({ index }) => index);

        let user;
        let member1Location;
        let member2Location;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
            .then((userProperties) => {
              user = userProperties;

              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C404405');
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then((res) => {
                member1Location = res;
              });

              cy.setTenant(Affiliations.University);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C404405');
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then((res) => {
                member2Location = res;
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiInventoryViewInstances.gui,
              ]);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C404405');

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
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                instancesData.forEach((instanceData) => {
                  if (instanceData.holdingsAffiliation) {
                    cy.setTenant(instanceData.holdingsAffiliation);
                    const location =
                      instanceData.holdingsAffiliation === Affiliations.College
                        ? member1Location
                        : member2Location;
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instanceData.instanceId,
                      permanentLocationId: location.id,
                      sourceId: folioSource.id,
                    });
                  }
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
          'C404405 Use "Source" facet when Search was executed in a member tenant ("Instance" tab) (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C404405'] },
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

            InventorySearchAndFilter.fillInSearchQuery(instancePrefix);
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyNumberOfSearchResults(allVisibleInstanceIndexes.length);
            allVisibleInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            InventorySearchAndFilter.clickAccordionByName(sourceAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(sourceAccordionName, true);
            InventorySearchAndFilter.verifyFilterOptionCount(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.FOLIO,
              visibleFolioInstanceIndexes.length,
            );
            InventorySearchAndFilter.verifyFilterOptionCount(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.MARC,
              visibleMarcInstanceIndexes.length,
            );
            InventorySearchAndFilter.verifyCheckboxInAccordion(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.FOLIO,
              false,
            );
            InventorySearchAndFilter.verifyCheckboxInAccordion(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.MARC,
              false,
            );

            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.FOLIO,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              visibleFolioInstanceIndexes.length,
            );
            visibleFolioInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.MARC,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(allVisibleInstanceIndexes.length);
            allVisibleInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.FOLIO,
              false,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(visibleMarcInstanceIndexes.length);
            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.MARC,
              false,
            );
            allVisibleInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.MARC,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(visibleMarcInstanceIndexes.length);
            visibleMarcInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.MARC,
              false,
            );
            allVisibleInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            InventorySearchAndFilter.fillInSearchQuery(
              instanceTitles[visibleFolioInstanceIndexes[0]],
            );
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifySearchResult(
              instanceTitles[visibleFolioInstanceIndexes[0]],
            );
            InventorySearchAndFilter.verifyFilterOptionCount(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.FOLIO,
              1,
            );
            InventorySearchAndFilter.verifyCheckboxOptionPresentInAccordion(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.MARC,
              false,
            );

            InventorySearchAndFilter.fillInSearchQuery(
              instanceTitles[visibleMarcInstanceIndexes[1]],
            );
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifySearchResult(
              instanceTitles[visibleMarcInstanceIndexes[1]],
            );
            InventorySearchAndFilter.verifyFilterOptionCount(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.MARC,
              1,
            );
            InventorySearchAndFilter.verifyCheckboxOptionPresentInAccordion(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.FOLIO,
              false,
            );
          },
        );
      });
    });
  });
});
