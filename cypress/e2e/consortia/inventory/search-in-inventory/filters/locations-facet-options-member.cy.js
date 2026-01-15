import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
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
        const instancePrefix = `AT_C471483_Instance_${randomPostfix}`;
        const locationAccordionName = 'Effective location (item)';
        const heldbyAccordionName = 'Held by';
        const instancesData = [
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdings: [
              {
                affiliation: Affiliations.College,
                locationIndex: 0,
                itemLocationIndex: null,
              },
              {
                affiliation: Affiliations.University,
                locationIndex: 0,
                itemLocationIndex: null,
              },
            ],
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdings: [
              {
                affiliation: Affiliations.College,
                locationIndex: 1,
                itemLocationIndex: 2,
              },
              {
                affiliation: Affiliations.University,
                locationIndex: 1,
                itemLocationIndex: 2,
              },
            ],
          },
        ];
        const instanceTitles = Array.from(
          { length: instancesData.length },
          (_, i) => `${instancePrefix}_${i}`,
        );
        const locations = {
          [Affiliations.College]: [],
          [Affiliations.University]: [],
        };
        const loanTypeIds = {};
        const materialTypeIds = {};
        let user;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
            .then((userProperties) => {
              user = userProperties;

              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C471483');
              cy.getLocations({
                limit: 3,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then(() => {
                locations[Affiliations.College].push(...Cypress.env('locations'));
              });
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
                loanTypeIds[Affiliations.College] = loanTypes[0].id;
              });
              cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
                materialTypeIds[Affiliations.College] = res.id;
              });

              cy.setTenant(Affiliations.University);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C471483');
              cy.getLocations({
                limit: 3,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then(() => {
                locations[Affiliations.University].push(...Cypress.env('locations'));
              });
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
                loanTypeIds[Affiliations.University] = loanTypes[0].id;
              });
              cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
                materialTypeIds[Affiliations.University] = res.id;
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiInventoryViewInstances.gui,
              ]);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C471483');

              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
                  instancesData.forEach((instanceData, index) => {
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
                  instanceData.holdings.forEach((holding) => {
                    cy.setTenant(holding.affiliation);
                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: instanceData.instanceId,
                      permanentLocationId: locations[holding.affiliation][holding.locationIndex].id,
                      sourceId: folioSource.id,
                    }).then((createdHoldings) => {
                      const itemData = {
                        holdingsRecordId: createdHoldings.id,
                        materialType: { id: materialTypeIds[holding.affiliation] },
                        permanentLoanType: { id: loanTypeIds[holding.affiliation] },
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      };
                      if (holding.itemLocationIndex !== null) {
                        itemData.permanentLocation = {
                          id: locations[holding.affiliation][holding.itemLocationIndex].id,
                        };
                      }
                      InventoryItems.createItemViaApi(itemData);
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
          'C471483 Locations from all existing tenants displays in "Effective location (item)" facet of search Instance pane in "Inventory" app opened from "Member" tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C471483'] },
          () => {
            const usedLocations = [
              locations[Affiliations.College][0].name,
              locations[Affiliations.College][2].name,
              locations[Affiliations.University][0].name,
              locations[Affiliations.University][2].name,
            ];
            const notUsedLocations = [
              locations[Affiliations.College][1].name,
              locations[Affiliations.University][1].name,
            ];

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

            InventorySearchAndFilter.clickAccordionByName(locationAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(locationAccordionName, true);
            InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
              locationAccordionName,
            );

            InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
              locationAccordionName,
              locations[Affiliations.University][0].name,
              locations[Affiliations.University][0].name,
            );

            InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
              locationAccordionName,
              '',
              '',
            );
            InventorySearchAndFilter.fillInSearchQuery(instancePrefix);
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
            instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title);
            });
            usedLocations.forEach((locationName) => {
              InventorySearchAndFilter.verifyOptionAvailableMultiselect(
                locationAccordionName,
                locationName,
              );
            });
            notUsedLocations.forEach((locationName) => {
              InventorySearchAndFilter.verifyOptionAvailableMultiselect(
                locationAccordionName,
                locationName,
                false,
              );
            });

            InventorySearchAndFilter.selectEcsLocationFilterOption(
              locationAccordionName,
              locations[Affiliations.University][2].name,
              tenantNames.university,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
            InventoryInstance.waitLoading();
          },
        );
      });
    });
  });
});
