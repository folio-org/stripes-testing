import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import InventoryMainButton from '../../support/fragments/inventory/inventoryMainButton';
import permissions from '../../support/dictionary/permissions';

let userId = '';

describe('ui-inventory: keyboard shortcut', () => {
  beforeEach('navigate to inventory', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui
    ])
      .then(userProperties => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password);
      });
    cy.visit(TopMenu.inventoryPath);
  });

  after('Delete all data', () => {
    cy.deleteUser(userId);
  });

  it('C345297 Keyboard Shortcut. Access to drop down menu', { tags: [testTypes.smoke] }, () => {
    InventoryMainButton.verifyInventoryDropdownIsShown('false');

    InventoryMainButton.openInventoryMenu();
    InventoryMainButton.verifyInventoryDropdownIsShown('true');
    InventoryMainButton.openShortcuts();

    InventoryMainButton.waitModalLoading('Keyboard shortcuts');
    InventoryMainButton.verifyInventoryDropdownIsShown('false');
  });
});
