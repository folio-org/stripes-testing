import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import InventoryMainButton from '../../support/fragments/inventory/inventoryMainButton';

describe('ui-inventory: keyboard shortcut', () => {
  beforeEach('navigate to inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.inventoryPath);
  });

  it('C196752 verifies action menu options before any search is conducted', { tags: [testTypes.smoke] }, () => {
    InventoryMainButton.verifyInventoryDropdownIsShown('false');

    InventoryMainButton.openInventoryMenu();
    InventoryMainButton.verifyInventoryDropdownIsShown('true');
    InventoryMainButton.openShortcuts();

    InventoryMainButton.verifyInventoryModalName('Keyboard shortcuts');
    InventoryMainButton.verifyInventoryDropdownIsShown('false');
  });
});
