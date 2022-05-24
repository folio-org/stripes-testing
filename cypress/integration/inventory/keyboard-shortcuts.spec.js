import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import InventoryMainButton from '../../support/fragments/inventory/inventoryMainButton';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryInstanceEdit from '../../support/fragments/inventory/InventoryInstanceEdit';

let userId = '';
const precedingTitleValue = `Preceding title test value ${getRandomPostfix()}`;
const isbnValue = `ISBN test value ${getRandomPostfix()}`;
const issnValue = `ISSN test value ${getRandomPostfix()}`;

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

  afterEach('Delete all data', () => {
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

  it('C345298 Keyboard Shortcut. Test the functionality of the different shortcut keys', { tags: [testTypes.smoke] }, () => {
    InventoryMainButton.verifyInventoryDropdownIsShown('false');

    InventoryMainButton.openInventoryMenu();
    InventoryMainButton.openShortcuts();

    InventoryMainButton.waitModalLoading('Keyboard shortcuts');
    InventoryMainButton.createNewRecordByShortcuts();
    InventoryMainButton.closeShortcuts();
    InventoryMainButton.fillInstanceInfo();
    InventoryMainButton.editRecordByShortcuts();
    InventoryInstanceEdit.addPrecedingTitle(0, precedingTitleValue, isbnValue, issnValue);
    InventoryMainButton.saveRecordByShortcuts();
    // TO DO: Need to wait for the loading of saving the edited information.Reason: the robot runs quickly and the test drops.
    cy.wait(2000);
    InventoryMainButton.openShortcutsByHotkey();
    InventoryMainButton.waitModalLoading('Keyboard shortcuts');
    InventoryMainButton.closeShortcutsByHotkey();
  });
});
