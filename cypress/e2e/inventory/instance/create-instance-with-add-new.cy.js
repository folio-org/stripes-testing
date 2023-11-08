import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import Helper from '../../../support/fragments/finance/financeHelper';
import { MultiColumnListCell } from '../../../../interactors';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('inventory', () => {
  describe('Instance', () => {
    const instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;

    before('navigate to Inventory', () => {
      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after(() => {
      cy.getAdminToken();
      InventoryInstances.getInstanceIdApi({ limit: 1, query: `title="${instanceTitle}"` }).then(
        (id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        },
      );
    });

    it(
      'C598 Create new instance with add "New" (folijet) (prokopovych)',
      { tags: [TestTypes.smoke, DevTeams.folijet] },
      () => {
        const InventoryNewInstance = InventoryInstances.addNewInventory();
        InventoryNewInstance.fillRequiredValues(instanceTitle);
        InventoryNewInstance.clickSaveAndCloseButton();

        InventorySearchAndFilter.searchInstanceByTitle(instanceTitle);

        cy.expect(MultiColumnListCell({ row: 0, content: instanceTitle }).exists());
      },
    );
  });
});
