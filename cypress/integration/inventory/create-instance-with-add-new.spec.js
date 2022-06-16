import searchInventory from '../../support/fragments/data_import/searchInventory';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import { MultiColumnListCell } from '../../../interactors';

describe('ui-inventory: Create new instance with add "New"', () => {
  const instanceTitle = `autoTestTitle${getRandomPostfix()}`;

  before('navigate to Inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C598 Create new instance with add "New"', { tags: [TestTypes.smoke] }, () => {
    InventoryInstances.add(instanceTitle);
    searchInventory.searchInstanceByTitle(instanceTitle);

    cy.expect(MultiColumnListCell({ row: 0, content: instanceTitle }).exists());
  });
});
