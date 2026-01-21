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
        const instancePrefix = `AT_C404394_Instance_${randomPostfix}`;
        const sourceAccordionName = 'Source';
        const instancesData = [
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.Consortia,
            hasHoldings: false,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.Consortia,
            hasHoldings: true,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.Consortia,
            hasHoldings: false,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.Consortia,
            hasHoldings: true,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.College,
            hasHoldings: false,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.College,
            hasHoldings: true,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.College,
            hasHoldings: false,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.College,
            hasHoldings: true,
          },
        ];
        const instanceTitles = instancesData.map(
          (instanceData, index) => `${instancePrefix} ${instanceData.instanceSource} ${index}`,
        );
        const sharedInstanceIndexes = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation === Affiliations.Consortia)
          .map(({ index }) => index);
        const sharedMarcInstanceIndexes = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation === Affiliations.Consortia)
          .filter(({ item }) => item.instanceSource === INSTANCE_SOURCE_NAMES.MARC)
          .map(({ index }) => index);
        const sharedFolioInstanceIndexes = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation === Affiliations.Consortia)
          .filter(({ item }) => item.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO)
          .map(({ index }) => index);

        let user;
        let memberLocation;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
            .then((userProperties) => {
              user = userProperties;

              cy.setTenant(Affiliations.College);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C404394');

              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then((res) => {
                memberLocation = res;
              });
            })
            .then(() => {
              cy.resetTenant();
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C404394');

              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
                  instancesData.forEach((noteData, index) => {
                    cy.setTenant(noteData.affiliation);

                    if (noteData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                      InventoryInstances.createFolioInstanceViaApi({
                        instance: {
                          instanceTypeId: instanceTypes[0].id,
                          title: `${instanceTitles[index]}`,
                        },
                      }).then((createdInstanceData) => {
                        noteData.instanceId = createdInstanceData.instanceId;
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
                        noteData.instanceId = instanceId;
                      });
                    }
                  });
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                instancesData.forEach((noteData) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: noteData.instanceId,
                    permanentLocationId: memberLocation.id,
                    sourceId: folioSource.id,
                  });
                });
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

          cy.resetTenant();
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        });

        it(
          'C404394 Use "Source" facet when Search was executed in "Central" tenant ("Instance" tab) (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C404394'] },
          () => {
            InventorySearchAndFilter.fillInSearchQuery(instancePrefix);
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyNumberOfSearchResults(sharedInstanceIndexes.length);
            sharedInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            InventorySearchAndFilter.clickAccordionByName(sourceAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(sourceAccordionName, true);
            InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
              sourceAccordionName,
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
            InventorySearchAndFilter.verifyNumberOfSearchResults(sharedFolioInstanceIndexes.length);
            sharedFolioInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.FOLIO,
              false,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(sharedInstanceIndexes.length);
            sharedInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.MARC,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(sharedMarcInstanceIndexes.length);
            sharedMarcInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.MARC,
              false,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(sharedInstanceIndexes.length);
            sharedInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            InventorySearchAndFilter.fillInSearchQuery(
              `${instancePrefix} ${INSTANCE_SOURCE_NAMES.FOLIO}`,
            );
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyNumberOfSearchResults(sharedFolioInstanceIndexes.length);
            sharedFolioInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            cy.intercept('/search/instances?*').as('getInstances');
            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.FOLIO,
            );
            cy.wait('@getInstances').its('response.statusCode').should('eq', 200);
            InventorySearchAndFilter.verifyNumberOfSearchResults(sharedFolioInstanceIndexes.length);
            sharedFolioInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            InventorySearchAndFilter.fillInSearchQuery(
              `${instancePrefix} ${INSTANCE_SOURCE_NAMES.MARC}`,
            );
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyResultPaneEmpty({
              searchQuery: `${instancePrefix} ${INSTANCE_SOURCE_NAMES.MARC}`,
              noResultsFound: true,
            });
            InventorySearchAndFilter.verifyFilterOptionCount(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.MARC,
              sharedMarcInstanceIndexes.length,
            );
            InventorySearchAndFilter.verifyFilterOptionCount(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.FOLIO,
              0,
            );

            InventorySearchAndFilter.clickAccordionByName(sourceAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(sourceAccordionName, false);
            InventorySearchAndFilter.bySource(INSTANCE_SOURCE_NAMES.FOLIO);
            InventorySearchAndFilter.verifyCheckboxOptionPresentInAccordion(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.FOLIO,
              false,
            );
            InventorySearchAndFilter.verifyCheckboxInAccordion(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.MARC,
              false,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(sharedMarcInstanceIndexes.length);
            sharedMarcInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
          },
        );
      });
    });
  });
});
