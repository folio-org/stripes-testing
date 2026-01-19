import { Permissions } from '../../../../../support/dictionary';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instanceTitlePrefix = `AT_C466235_Instance_${randomPostfix}`;
        const staffSuppressAccordionName = 'Staff suppress';
        const heldbyAccordionName = 'Held by';
        const instancesData = [
          {
            staffSuppressed: false,
          },
          {
            staffSuppressed: true,
          },
        ];
        const instanceTitles = Array.from(
          { length: instancesData.length },
          (_, i) => `${instanceTitlePrefix}_${i}`,
        );
        const instanceIds = [];
        let instanceTypeId;
        let user;

        before('Create test data and login', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.then(() => {
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            });
          })
            .then(() => {
              instancesData.forEach((instanceData, instanceIndex) => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instanceTitles[instanceIndex],
                    staffSuppress: instanceData.staffSuppressed,
                  },
                }).then((createdInstanceData) => {
                  instanceIds.push(createdInstanceData.instanceId);
                });
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.createTempUser([
                Permissions.enableStaffSuppressFacet.gui,
                Permissions.uiInventoryViewInstances.gui,
              ]).then((userProperties) => {
                user = userProperties;

                cy.assignAffiliationToUser(Affiliations.College, user.userId);

                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(user.userId, [
                  Permissions.enableStaffSuppressFacet.gui,
                  Permissions.uiInventoryViewInstances.gui,
                ]);

                cy.resetTenant();
                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                InventorySearchAndFilter.validateSearchTabIsDefault();
              });
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(user.userId);
          instanceIds.forEach((id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C466235 Staff suppress facet is OFF by default when user has permission to use facet in three segments (Instance|Holdings|Item) in Central and Member tenant (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C466235'] },
          () => {
            function checkNoStaffSuppressParamInUrl() {
              cy.url().then((url) => {
                expect(url.includes('?filters=staffSuppress.false')).to.eq(false);
                expect(url.includes('staffSuppress.false')).to.eq(false);
              });
            }

            function checkInstanceTab() {
              InventorySearchAndFilter.instanceTabIsDefault();
              checkNoStaffSuppressParamInUrl();
              InventorySearchAndFilter.checkClearIconShownInAccordionHeader(
                staffSuppressAccordionName,
                false,
              );

              InventoryInstances.searchByTitle(instanceTitlePrefix);
              InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);
              instanceTitles.forEach((title) => {
                InventorySearchAndFilter.verifySearchResult(title);
              });

              InventorySearchAndFilter.expandAccordion(staffSuppressAccordionName);
              InventorySearchAndFilter.verifyAccordionByNameExpanded(
                staffSuppressAccordionName,
                true,
              );
              InventorySearchAndFilter.verifyCheckboxInAccordion(
                staffSuppressAccordionName,
                'No',
                false,
              );
              InventorySearchAndFilter.verifyCheckboxInAccordion(
                staffSuppressAccordionName,
                'Yes',
                false,
              );
            }

            function checkHoldingsOrItemTab() {
              InventorySearchAndFilter.verifySearchFieldIsEmpty();
              InventorySearchAndFilter.verifyResultPaneEmpty();
              InventorySearchAndFilter.verifyAccordionExistance(staffSuppressAccordionName, false);
              checkNoStaffSuppressParamInUrl();

              InventoryInstances.searchByTitle(instanceTitles[1]);
              InventorySearchAndFilter.verifyNumberOfSearchResults(1);
              InventorySearchAndFilter.verifySearchResult(instanceTitles[1]);

              InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
              InventorySearchAndFilter.verifySearchFieldIsEmpty();
              checkNoStaffSuppressParamInUrl();
            }

            checkInstanceTab();

            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
            checkHoldingsOrItemTab();

            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            checkHoldingsOrItemTab();

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
            checkInstanceTab();

            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
            checkHoldingsOrItemTab();

            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
            checkHoldingsOrItemTab();
          },
        );
      });
    });
  });
});
