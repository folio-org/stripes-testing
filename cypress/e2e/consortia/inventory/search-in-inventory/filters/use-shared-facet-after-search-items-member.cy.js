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
        const instancePrefix = `AT_C402339_Instance_${randomPostfix}`;
        const barcodePrefix = `AT_C402339_Barcode_${randomPostfix}`;
        const barcodeSearchOption = 'Barcode';
        const heldbyAccordionName = 'Held by';
        const sharedAccordionName = 'Shared';
        const instanceData = [
          {
            barcodeValue: `${barcodePrefix}_1_Shared_Folio`,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.Consortia,
          },
          {
            barcodeValue: `${barcodePrefix}_2_Shared_Marc`,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.Consortia,
          },
          {
            barcodeValue: `${barcodePrefix}_1_Local_Folio`,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.College,
          },
          {
            barcodeValue: `${barcodePrefix}_2_Local_Marc`,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.College,
          },
        ];
        const instanceTitles = Array.from(
          { length: instanceData.length },
          (_, i) => `${instancePrefix}_${i}`,
        );
        const sharedInstanceIndexes = instanceData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation === Affiliations.Consortia)
          .map(({ index }) => index);
        const localInstanceIndexes = instanceData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation === Affiliations.College)
          .map(({ index }) => index);

        let user;
        let memberLocation;
        let loanTypeId;
        let materialTypeId;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402339');

          cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
            .then((userProperties) => {
              user = userProperties;

              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then((res) => {
                memberLocation = res;
              });
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
                loanTypeId = loanTypes[0].id;
              });
              cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
                materialTypeId = res.id;
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiInventoryViewInstances.gui,
              ]);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402339');

              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
                  instanceData.forEach((instance, index) => {
                    cy.setTenant(instance.affiliation);

                    if (instance.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                      InventoryInstances.createFolioInstanceViaApi({
                        instance: {
                          instanceTypeId: instanceTypes[0].id,
                          title: `${instanceTitles[index]}`,
                        },
                      }).then((createdInstanceData) => {
                        instance.instanceId = createdInstanceData.instanceId;
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
                        instance.instanceId = instanceId;
                      });
                    }
                  });
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                instanceData.forEach((instance) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instance.instanceId,
                    permanentLocationId: memberLocation.id,
                    sourceId: folioSource.id,
                  }).then((holding) => {
                    InventoryItems.createItemViaApi({
                      holdingsRecordId: holding.id,
                      materialType: { id: materialTypeId },
                      permanentLoanType: { id: loanTypeId },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      barcode: instance.barcodeValue,
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

          cy.resetTenant();
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        });

        it(
          'C402339 Use "Shared" facet when Search was executed in "Member" tenant ("Item" tab) (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C402339'] },
          () => {
            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
            InventorySearchAndFilter.clickAccordionByName(heldbyAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(heldbyAccordionName, true);
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              false,
            );

            InventorySearchAndFilter.selectSearchOption(barcodeSearchOption);
            InventorySearchAndFilter.verifyDefaultSearchOptionSelected(barcodeSearchOption);

            InventorySearchAndFilter.clickAccordionByName(sharedAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName, true);
            InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
              sharedAccordionName,
            );
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

            InventorySearchAndFilter.fillInSearchQuery(`${barcodePrefix}*`);
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

            InventorySearchAndFilter.selectSearchOption(barcodeSearchOption);
            InventorySearchAndFilter.verifyDefaultSearchOptionSelected(barcodeSearchOption);
            InventorySearchAndFilter.fillInSearchQuery(`${barcodePrefix}_2*`);
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyNumberOfSearchResults(1);
            InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);
            InventorySearchAndFilter.verifySharedIconForResult(instanceTitles[1], true);
            InventoryInstance.waitLoading();
          },
        );
      });
    });
  });
});
