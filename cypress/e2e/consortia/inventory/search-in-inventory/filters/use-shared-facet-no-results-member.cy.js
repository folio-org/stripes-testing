import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const notExistingTitle = `AT_C402328_NotExistingTitle_${randomPostfix}`;
        const sharedAccordionName = 'Shared';
        const sharedInstances = InventoryInstances.generateFolioInstances({
          count: 1,
          holdingsCount: 0,
          itemsCount: 0,
        });
        const localInstances = InventoryInstances.generateFolioInstances({
          count: 1,
          holdingsCount: 0,
          itemsCount: 0,
        });

        let user;

        before('Create user, login', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: sharedInstances,
          });

          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
            .then((userProperties) => {
              user = userProperties;

              InventoryInstances.createFolioInstancesViaApi({
                folioInstances: localInstances,
              });

              cy.resetTenant();
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiInventoryViewInstances.gui,
              ]);
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              InventorySearchAndFilter.validateSearchTabIsDefault();
              InventorySearchAndFilter.instanceTabIsDefault();
            });
        });

        after('Delete user', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstance.deleteInstanceViaApi(sharedInstances[0].instanceId);
          cy.setTenant(Affiliations.College);
          InventoryInstance.deleteInstanceViaApi(localInstances[0].instanceId);
          Users.deleteViaApi(user.userId);
        });

        it(
          'C402328 Use "Shared" facet when no records found during Search in "Member" tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C402328'] },
          () => {
            function searchAndCheckSharedFacet() {
              InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, true);

              InventorySearchAndFilter.clickAccordionByName(sharedAccordionName);
              InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName, true);
              InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
                sharedAccordionName,
              );
              InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
              InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

              InventorySearchAndFilter.fillInSearchQuery(notExistingTitle);
              InventorySearchAndFilter.clickSearch();
              InventorySearchAndFilter.verifyResultPaneEmpty({
                searchQuery: notExistingTitle,
                noResultsFound: true,
              });
              InventorySearchAndFilter.verifyNoCheckboxesInAccordion(sharedAccordionName);
            }

            // Search in Instances
            searchAndCheckSharedFacet();

            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
            InventorySearchAndFilter.verifyResultPaneEmpty();
            InventorySearchAndFilter.checkSearchQueryText('');

            // Search in Holdings
            searchAndCheckSharedFacet();

            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            InventorySearchAndFilter.verifyResultPaneEmpty();
            InventorySearchAndFilter.checkSearchQueryText('');

            // Search in Items
            searchAndCheckSharedFacet();
          },
        );
      });
    });
  });
});
