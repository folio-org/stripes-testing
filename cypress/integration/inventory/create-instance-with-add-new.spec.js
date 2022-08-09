import SearchInventory from '../../support/fragments/data_import/searchInventory';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import Helper from '../../support/fragments/finance/financeHelper';
import { MultiColumnListCell } from '../../../interactors';
import DevTeams from '../../support/dictionary/devTeams';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

describe('ui-inventory: Create new instance with add "New"', () => {
  const instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;

  before('navigate to Inventory', () => {
    cy.loginAsAdmin({ path: TopMenu.inventoryPath, waiter: InventoryInstances.waitContentLoading });
    cy.getAdminToken();
  });

  after(() => {
    InventoryInstances.getInstanceIdApi({ limit: 1, query: `title="${instanceTitle}"` })
      .then((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
  });

  it('C598 Create new instance with add "New" (folijet) (prokopovych)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    InventoryInstances.add(instanceTitle);
    SearchInventory.searchInstanceByTitle(instanceTitle);

    cy.expect(MultiColumnListCell({ row: 0, content: instanceTitle }).exists());
  });
});
