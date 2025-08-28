import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C353588_FolioInstance_${randomPostfix}`;

    const instanceIds = [];
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      for (let index = 0; index < 3; index++) {
        InventoryInstance.createInstanceViaApi({
          instanceTitle: `${instanceTitlePrefix}_${index}`,
        }).then(({ instanceData }) => {
          instanceIds.push(instanceData.instanceId);
        });
      }

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
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
      'C353588 Displaying detail view pane automatically when search return 1 record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C353588'] },
      () => {
        InventoryInstances.searchByTitle(`${instanceTitlePrefix}_0`);
        InventorySearchAndFilter.checkRowsCount(1);
        InventoryInstance.verifyInstanceTitle(`${instanceTitlePrefix}_0`);
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventorySearchAndFilter.checkRowsCount(1);

        InventoryInstances.searchByTitle(instanceTitlePrefix);
        for (let index = 0; index < 3; index++) {
          InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
        }
        InventoryInstances.selectInstanceByTitle(`${instanceTitlePrefix}_2`);
        InventoryInstance.verifyInstanceTitle(`${instanceTitlePrefix}_2`);

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventoryInstances.searchByTitle(`${instanceTitlePrefix}_1`);
        InventorySearchAndFilter.checkRowsCount(1);
        InventoryInstance.verifyInstanceTitle(`${instanceTitlePrefix}_1`);
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventorySearchAndFilter.checkRowsCount(1);

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        InventorySearchAndFilter.verifyResultPaneEmpty();
        InventoryInstances.searchByTitle(`${instanceTitlePrefix}_2`);
        InventorySearchAndFilter.checkRowsCount(1);
        InventoryInstance.verifyInstanceTitle(`${instanceTitlePrefix}_2`);
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventorySearchAndFilter.checkRowsCount(1);
      },
    );
  });
});
