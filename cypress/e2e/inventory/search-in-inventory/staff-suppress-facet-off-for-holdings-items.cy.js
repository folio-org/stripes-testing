import { Permissions } from '../../../support/dictionary';
import InventoryInstances, {
  searchInstancesOptions,
  searchHoldingsOptions,
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C464312_FolioInstance_${randomPostfix}`;
      const accordionName = 'Staff suppress';
      const staffSuppressedInstanceIndexes = [2, 4];
      const notStaffSuppressedInstanceIndexes = [1, 3];
      const instanceIds = [];
      let user;

      before('Create test data and login', () => {
        cy.getAdminToken();

        cy.then(() => {
          // Create FOLIO instances
          [1, 2, 3, 4].forEach((folioIndex) => {
            InventoryInstance.createInstanceViaApi({
              instanceTitle: `${instanceTitlePrefix}_${folioIndex}`,
            }).then(({ instanceData }) => {
              instanceIds.push(instanceData.instanceId);
            });
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
        'C464312 Staff suppress facet is off by default (search by "Keyword") in Holdings and Item segments when "Yes" was selected in "Staff suppress" facet (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C464312'] },
        () => {
          // Verify we're on Instance tab and Search tab by default
          InventorySearchAndFilter.instanceTabIsDefault();
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchInstancesOptions[0]);
          InventorySearchAndFilter.verifyAccordionExistance(accordionName);

          // Step 1: Expand the "Staff suppress" facet
          InventorySearchAndFilter.expandAccordion(accordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(accordionName, true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(accordionName, 'No', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(accordionName, 'Yes', false);

          // Step 2: Check "Yes" option
          InventorySearchAndFilter.selectOptionInExpandedFilter(accordionName, 'Yes');
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.verifyCheckboxInAccordion(accordionName, 'Yes', true);

          // Step 3: Click on Holdings tab
          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchHoldingsOptions[0]);
          InventorySearchAndFilter.verifySearchFieldIsEmpty();
          InventorySearchAndFilter.verifyResultPaneEmpty();
          InventorySearchAndFilter.verifyAccordionExistance(accordionName, false);

          // Step 4: Run search which will return all records
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

          // Step 5: Click on Item tab
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchItemsOptions[0]);
          InventorySearchAndFilter.verifySearchFieldIsEmpty();
          InventorySearchAndFilter.verifyResultPaneEmpty();
          InventorySearchAndFilter.verifyAccordionExistance(accordionName, false);

          // Step 6: Run search which will return all records
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
