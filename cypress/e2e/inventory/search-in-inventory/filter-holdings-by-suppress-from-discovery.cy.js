import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix from '../../../support/utils/stringTools';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C9301_FolioInstance_${randomPostfix}`;
      const suppressDiscoveryAccordion = 'Suppress from discovery';
      const originallySuppressedInstanceIndexes = [2, 5];
      const suppressedInstanceIndexes = [1, 6];
      const notSuppressedInstanceIndexes = [3, 4, 7];
      let user;
      let location;

      const folioInstances = InventoryInstances.generateFolioInstances({
        count: 7,
        instanceTitlePrefix,
        holdingsCount: 1,
        itemsCount: 0,
      });
      folioInstances.forEach((instance, index) => {
        instance.instanceTitle = `${instanceTitlePrefix}_${index + 1}`;
      });

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C9301_FolioInstance');
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiInventoryViewCreateEditInstances.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
          })
            .then((res) => {
              location = res;

              InventoryInstances.createFolioInstancesViaApi({
                folioInstances,
                location,
              });
            })
            .then(() => {
              originallySuppressedInstanceIndexes.forEach((index) => {
                cy.getHoldings({
                  limit: 1,
                  expandAll: true,
                  query: `"instanceId"="${folioInstances[index - 1].instanceId}"`,
                }).then((holdings) => {
                  cy.updateHoldingRecord(holdings[0].id, {
                    ...holdings[0],
                    discoverySuppress: true,
                  });
                });
              });
            });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C9301 Filter "Instance" records by "Suppress from discovery" filter in the "Holdings" segment (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C9301'] },
        () => {
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);

          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();

          suppressedInstanceIndexes.forEach((index) => {
            InventoryInstances.searchByTitle(instanceTitlePrefix);
            InventorySearchAndFilter.verifyResultListExists();
            for (let i = 1; i <= 7; i++) {
              InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${i}`);
            }
            InventoryInstances.selectInstanceByTitle(`${instanceTitlePrefix}_${index}`);
            InventoryInstance.waitLoading();
            InventoryInstance.openHoldingView();
            HoldingsRecordView.edit();
            HoldingsRecordEdit.markAsSuppressedFromDiscovery();
            HoldingsRecordEdit.checkMarkedAsSuppressedFromDiscovery();
            HoldingsRecordEdit.saveAndClose();
            HoldingsRecordView.waitLoading();
            HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();
            HoldingsRecordView.close();
            InventoryInstance.waitLoading();
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          });

          InventoryInstances.searchByTitle(instanceTitlePrefix);
          InventorySearchAndFilter.verifyResultListExists();
          for (let i = 1; i <= 7; i++) {
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${i}`);
          }

          InventorySearchAndFilter.expandAccordion(suppressDiscoveryAccordion);
          InventorySearchAndFilter.verifyCheckboxInAccordion(suppressDiscoveryAccordion, 'No');
          InventorySearchAndFilter.verifyCheckboxInAccordion(suppressDiscoveryAccordion, 'Yes');

          InventorySearchAndFilter.selectOptionInExpandedFilter(suppressDiscoveryAccordion, 'Yes');
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(
            originallySuppressedInstanceIndexes.length + suppressedInstanceIndexes.length,
          );
          [...originallySuppressedInstanceIndexes, ...suppressedInstanceIndexes].forEach(
            (index) => {
              InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
            },
          );

          InventorySearchAndFilter.selectOptionInExpandedFilter(
            suppressDiscoveryAccordion,
            'Yes',
            false,
          );
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(7);
          for (let i = 1; i <= 7; i++) {
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${i}`);
          }

          InventorySearchAndFilter.selectOptionInExpandedFilter(suppressDiscoveryAccordion, 'No');
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(notSuppressedInstanceIndexes.length);
          notSuppressedInstanceIndexes.forEach((index) => {
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
          });
        },
      );
    });
  });
});
