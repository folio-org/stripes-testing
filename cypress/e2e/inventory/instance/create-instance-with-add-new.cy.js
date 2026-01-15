import { MultiColumnListCell } from '../../../../interactors';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('Instance', () => {
    const instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;

    before('Login', () => {
      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.getInstanceIdApi({ limit: 1, query: `title="${instanceTitle}"` }).then(
          (id) => {
            InventoryInstance.deleteInstanceViaApi(id);
          },
        );
      });
    });

    it(
      'C598 Create new instance with add "New" (folijet)',
      { tags: ['smoke', 'folijet', 'C598', 'shiftLeft'] },
      () => {
        const InventoryNewInstance = InventoryInstances.addNewInventory();
        InventoryNewInstance.fillRequiredValues(instanceTitle);
        InventoryNewInstance.clickSaveAndCloseButton();
        cy.wait(5000);
        InventorySearchAndFilter.searchInstanceByTitle(instanceTitle);

        cy.expect(MultiColumnListCell({ row: 0, content: instanceTitle }).exists());
      },
    );
  });
});
