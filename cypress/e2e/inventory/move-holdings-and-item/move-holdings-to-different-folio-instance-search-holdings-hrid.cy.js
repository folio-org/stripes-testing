import InventoryInstances, {
  searchHoldingsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import { Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstancesMovement from '../../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

describe('Inventory', () => {
  describe('Move holdings and item', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C366108_FolioInstance_${randomPostfix}`;
    const holdingsHridOption = searchHoldingsOptions[7];
    const instancesData = {
      folioInstancesA: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix: `${instanceTitlePrefix} A`,
        holdingsCount: 1,
        itemsCount: 1,
      }),
      folioInstancesB: InventoryInstances.generateFolioInstances({
        count: 1,
        instanceTitlePrefix: `${instanceTitlePrefix} B`,
        holdingsCount: 0,
        itemsCount: 0,
      }),
    };

    let user;
    let location;
    let holdingsHrid;
    const instanceIds = [];

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C366108');

      cy.then(() => {
        cy.getLocations({
          limit: 1,
          query: '(isActive=true and name<>"AT_*" and name<>"autotest*")',
        }).then((res) => {
          location = res;
        });
      })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: instancesData.folioInstancesA,
            location,
          });
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: instancesData.folioInstancesB,
          });
        })
        .then(() => {
          instanceIds.push(
            instancesData.folioInstancesA[0].instanceId,
            instancesData.folioInstancesB[0].instanceId,
          );
          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${instanceIds[0]}"`,
          }).then((holdings) => {
            holdingsHrid = holdings[0].hrid;
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiInventoryMoveItems.gui,
            Permissions.uiInventoryHoldingsMove.gui,
          ]).then((userProperties) => {
            user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      instanceIds.forEach((id) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C366108 Verify that search by "Holdings HRID" for "Holdings" which moved from one "Instance" to another will return only one record. (spitfire)',
      {
        tags: ['extendedPath', 'spitfire', 'C366108'],
      },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(instanceIds[0]);
        InventoryInstances.selectInstanceById(instanceIds[0]);
        InventoryInstance.waitLoading();

        InventoryInstance.moveHoldingsToAnotherInstanceByItemTitle(
          location.name,
          `${instanceTitlePrefix} B`,
        );
        InventoryInstancesMovement.checkHoldingsMoveSuccessCallout(1);
        InventoryInstancesMovement.verifyHoldingsMoved(location.name, '1');
        InventoryInstancesMovement.verifyHoldingsLocationInInstancePane(
          location.name,
          `${instanceTitlePrefix} B`,
          true,
        );

        InventoryInstance.viewHoldings();
        HoldingsRecordView.waitLoading();
        cy.stubBrowserPrompt();
        HoldingsRecordView.copyHoldingsHrid();
        cy.checkBrowserPrompt({ callNumber: 0, promptValue: holdingsHrid });

        HoldingsRecordView.close();
        InventoryInstance.waitLoading();

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.searchByParameter(holdingsHridOption, holdingsHrid);
        InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix} B`);
        InventorySearchAndFilter.checkRowsCount(1);
      },
    );
  });
});
