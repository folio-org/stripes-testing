import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
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
        const instancePrefix = `AT_C402338_Instance_${randomPostfix}`;
        const notePrefix = `AT_C402338_AdminNote_${randomPostfix}`;
        const notesSearchOption = 'Holdings administrative notes';
        const heldbyAccordionName = 'Held by';
        const sharedAccordionName = 'Shared';
        const notesData = [
          {
            noteValue: `${notePrefix} 1 Shared Folio`,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.Consortia,
          },
          {
            noteValue: `${notePrefix} 2 Shared Marc`,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.Consortia,
          },
          {
            noteValue: `${notePrefix} 3 Local Folio`,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.College,
          },
          {
            noteValue: `${notePrefix} 4 Local Marc`,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.College,
          },
        ];
        const instanceTitles = Array.from(
          { length: notesData.length },
          (_, i) => `${instancePrefix}_${i}`,
        );
        const sharedInstanceIndexes = notesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation === Affiliations.Consortia)
          .map(({ index }) => index);
        const localInstanceIndexes = notesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation === Affiliations.College)
          .map(({ index }) => index);

        let user;
        let memberLocation;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402338');

          cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
            .then((userProperties) => {
              user = userProperties;

              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then((res) => {
                memberLocation = res;
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiInventoryViewInstances.gui,
              ]);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402338');

              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
                  notesData.forEach((noteData, index) => {
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
                notesData.forEach((noteData) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: noteData.instanceId,
                    permanentLocationId: memberLocation.id,
                    sourceId: folioSource.id,
                    administrativeNotes: [noteData.noteValue],
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
              InventorySearchAndFilter.switchToHoldings();
              InventorySearchAndFilter.holdingsTabIsDefault();
            });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

          cy.resetTenant();
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        });

        it(
          'C402338 Use "Shared" facet when Search was executed in "Member" tenant ("Holdings" tab) (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C402338'] },
          () => {
            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
            InventorySearchAndFilter.clickAccordionByName(heldbyAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(heldbyAccordionName, true);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );

            InventorySearchAndFilter.selectSearchOption(notesSearchOption);
            InventorySearchAndFilter.verifyDefaultSearchOptionSelected(notesSearchOption);

            InventorySearchAndFilter.clickAccordionByName(sharedAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName, true);
            InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
              sharedAccordionName,
            );
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

            InventorySearchAndFilter.fillInSearchQuery(notePrefix);
            InventorySearchAndFilter.clickSearch();
            instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title);
              InventorySearchAndFilter.verifySharedIconForResult(
                title,
                sharedInstanceIndexes.includes(instanceTitles.indexOf(title)),
              );
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
            InventorySearchAndFilter.verifyFilterOptionCount(
              sharedAccordionName,
              'Yes',
              sharedInstanceIndexes.length,
            );
            InventorySearchAndFilter.verifyFilterOptionCount(
              sharedAccordionName,
              'No',
              localInstanceIndexes.length,
            );

            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
            InventorySearchAndFilter.verifyNumberOfSearchResults(localInstanceIndexes.length);
            localInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
              InventorySearchAndFilter.verifySharedIconForResult(
                instanceTitles[instanceIndex],
                false,
              );
            });

            InventoryInstances.selectInstanceByTitle(instanceTitles[localInstanceIndexes[0]]);
            InventoryInstance.waitLoading();
            InventoryInstance.checkSharedTextInDetailView(false);

            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', false);
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
            instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title);
              InventorySearchAndFilter.verifySharedIconForResult(
                title,
                sharedInstanceIndexes.includes(instanceTitles.indexOf(title)),
              );
            });

            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
            InventorySearchAndFilter.verifyNumberOfSearchResults(sharedInstanceIndexes.length);
            sharedInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
              InventorySearchAndFilter.verifySharedIconForResult(
                instanceTitles[instanceIndex],
                true,
              );
            });

            InventoryInstances.selectInstanceByTitle(instanceTitles[sharedInstanceIndexes[0]]);
            InventoryInstance.waitLoading();
            InventoryInstance.checkSharedTextInDetailView(true);
            InventorySearchAndFilter.closeInstanceDetailPane();
            InventorySearchAndFilter.verifyNumberOfSearchResults(sharedInstanceIndexes.length);
            sharedInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySharedIconForResult(
                instanceTitles[instanceIndex],
                true,
              );
            });

            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sharedAccordionName,
              'Yes',
              false,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
            instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title);
              InventorySearchAndFilter.verifySharedIconForResult(
                title,
                sharedInstanceIndexes.includes(instanceTitles.indexOf(title)),
              );
            });

            cy.intercept('/search/instances?*').as('getInstances1');
            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
            cy.wait('@getInstances1').its('response.statusCode').should('eq', 200);
            cy.intercept('/search/instances?*').as('getInstances2');
            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
            cy.wait('@getInstances2').its('response.statusCode').should('eq', 200);
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
            instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title);
              InventorySearchAndFilter.verifySharedIconForResult(
                title,
                sharedInstanceIndexes.includes(instanceTitles.indexOf(title)),
              );
            });

            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventorySearchAndFilter.checkSearchQueryText('');
            InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
              sharedAccordionName,
            );
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
            InventorySearchAndFilter.checkSharedInstancesInResultList();

            InventorySearchAndFilter.fillInSearchQuery(instancePrefix);
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyNumberOfSearchResults(sharedInstanceIndexes.length);
            sharedInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
              InventorySearchAndFilter.verifySharedIconForResult(
                instanceTitles[instanceIndex],
                true,
              );
            });
          },
        );
      });
    });
  });
});
