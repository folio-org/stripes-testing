import { MultiColumnListCell } from '../../../../../interactors';
import Helper from '../../../../support/fragments/finance/financeHelper';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Inventory', () => {
  describe('Instance', () => {
    const instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;

    before('Login', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    after('Delete test data', () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password);
      cy.allure().logCommandSteps(true);
      InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
    });

    it(
      'C598 Create new instance with add "New" (folijet)',
      { tags: ['dryRun', 'folijet', 'C598'] },
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
