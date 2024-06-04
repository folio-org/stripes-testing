import TopMenu from '../../../support/fragments/topMenu';
import Inventory from '../../../support/fragments/inventory/inventorySearchAndFilter';

describe('fse-inventory - UI', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin();
    cy.allure().logCommandSteps();
  });

  it(
    'TC195318 - verify that inventory page is displayed',
    { tags: ['sanity', 'fse', 'ui', 'inventory'] },
    () => {
      cy.visit(TopMenu.inventoryPath);
      Inventory.waitLoading();
    },
  );
});
