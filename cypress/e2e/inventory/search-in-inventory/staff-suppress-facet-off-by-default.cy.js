import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C446021_Instance_${randomPostfix}`;
      const accordionName = 'Staff suppress';
      const staffSuppressedInstanceIndexes = [2, 4];
      const notStaffSuppressedInstanceIndexes = [1, 3];
      const instanceIds = [];
      let user;

      before('Create test data and login', () => {
        cy.getAdminToken();

        cy.then(() => {
          // Create 2 FOLIO instances
          [1, 2].forEach((folioIndex) => {
            InventoryInstance.createInstanceViaApi({
              instanceTitle: `${instanceTitlePrefix}_${folioIndex}`,
            }).then(({ instanceData }) => {
              instanceIds.push(instanceData.instanceId);
            });
          });
          // Create 2 MARC instances
          [3, 4].forEach((marcIndex) => {
            cy.createSimpleMarcBibViaAPI(`${instanceTitlePrefix}_${marcIndex}`).then(
              (instanceId) => {
                instanceIds.push(instanceId);
              },
            );
          });
        }).then(() => {
          // Update staff suppress state where needed
          staffSuppressedInstanceIndexes.forEach((index) => {
            cy.getInstanceById(instanceIds[index - 1]).then((body) => {
              body.staffSuppress = true;
              cy.updateInstance(body);
            });
          });

          cy.createTempUser([
            Permissions.enableStaffSuppressFacet.gui,
            Permissions.uiInventoryViewInstances.gui,
          ]).then((userProperties) => {
            user = userProperties;
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        instanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C446021 Staff suppress facet is off by default (search by "Keyword") in three segments (Instance|Holdings|Item) when user has permission to use facet (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C446021'] },
        () => {
          // Verify we're on Instance tab and Search tab by default
          InventorySearchAndFilter.instanceTabIsDefault();
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyAccordionExistance(accordionName);

          // Step 1: Expand the "Staff suppress" facet
          InventorySearchAndFilter.expandAccordion(accordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(accordionName, true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(accordionName, 'No', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(accordionName, 'Yes', false);

          // Step 2: Run search that returns both not suppressed MARC and FOLIO records
          InventoryInstances.searchByTitle(instanceTitlePrefix);
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(
            staffSuppressedInstanceIndexes.length + notStaffSuppressedInstanceIndexes.length,
          );
          [...staffSuppressedInstanceIndexes, ...notStaffSuppressedInstanceIndexes].forEach(
            (index) => {
              InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
            },
          );

          // Step 3: Check "Yes" option in Staff suppress facet
          InventorySearchAndFilter.selectOptionInExpandedFilter(accordionName, 'Yes');
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(staffSuppressedInstanceIndexes.length);
          staffSuppressedInstanceIndexes.forEach((index) => {
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
          });

          // Step 4: Uncheck "Yes" and check "No" option
          InventorySearchAndFilter.selectOptionInExpandedFilter(accordionName, 'Yes', false);
          InventorySearchAndFilter.selectOptionInExpandedFilter(accordionName, 'No');
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(notStaffSuppressedInstanceIndexes.length);
          notStaffSuppressedInstanceIndexes.forEach((index) => {
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
          });

          // Step 5: Click on Holdings tab
          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          InventorySearchAndFilter.verifySearchFieldIsEmpty();
          InventorySearchAndFilter.verifyResultPaneEmpty();
          InventorySearchAndFilter.verifyAccordionExistance(accordionName, false);

          // Step 6: Run search in Holdings tab
          InventoryInstances.searchByTitle(instanceTitlePrefix);
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(
            staffSuppressedInstanceIndexes.length + notStaffSuppressedInstanceIndexes.length,
          );
          [...staffSuppressedInstanceIndexes, ...notStaffSuppressedInstanceIndexes].forEach(
            (index) => {
              InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
            },
          );

          // Step 7: Reset all
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.verifySearchFieldIsEmpty();

          // Step 8: Run search again
          InventoryInstances.searchByTitle(instanceTitlePrefix);
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(
            staffSuppressedInstanceIndexes.length + notStaffSuppressedInstanceIndexes.length,
          );
          [...staffSuppressedInstanceIndexes, ...notStaffSuppressedInstanceIndexes].forEach(
            (index) => {
              InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
            },
          );

          // Step 9: Click on Item tab
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          InventorySearchAndFilter.verifySearchFieldIsEmpty();
          InventorySearchAndFilter.verifyResultPaneEmpty();
          InventorySearchAndFilter.verifyAccordionExistance(accordionName, false);

          // Step 10: Run search in Item tab
          InventoryInstances.searchByTitle(instanceTitlePrefix);
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(
            staffSuppressedInstanceIndexes.length + notStaffSuppressedInstanceIndexes.length,
          );
          [...staffSuppressedInstanceIndexes, ...notStaffSuppressedInstanceIndexes].forEach(
            (index) => {
              InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
            },
          );

          // Step 11: Reset all
          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.verifySearchFieldIsEmpty();

          // Step 12: Run search again
          InventoryInstances.searchByTitle(instanceTitlePrefix);
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(
            staffSuppressedInstanceIndexes.length + notStaffSuppressedInstanceIndexes.length,
          );
          [...staffSuppressedInstanceIndexes, ...notStaffSuppressedInstanceIndexes].forEach(
            (index) => {
              InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
            },
          );
        },
      );
    });
  });
});
