import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import InventoryKeyboardShortcuts from '../../support/fragments/inventory/inventoryKeyboardShortcuts';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryInstanceEdit from '../../support/fragments/inventory/InventoryInstanceEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryHotkeys from '../../support/fragments/inventory/inventoryHotkeys';
import SearchInventory from '../../support/fragments/data_import/searchInventory';
import devTeams from '../../support/dictionary/devTeams';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import users from '../../support/fragments/users/users';

let userId = '';
const precedingTitleValue = `Preceding title test value ${getRandomPostfix()}`;
const isbnValue = `ISBN test value ${getRandomPostfix()}`;
const issnValue = `ISSN test value ${getRandomPostfix()}`;
const hotKeys = InventoryHotkeys.hotKeys;
const instanceTitle = `Instance_Test_Title_${getRandomPostfix()}`;

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
    users.deleteViaApi(userId);
  });

  it('C345297 Keyboard Shortcut. Access to drop down menu', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    InventoryKeyboardShortcuts.verifyInventoryDropdownIsShown('false');

    InventoryKeyboardShortcuts.openInventoryMenu();
    InventoryKeyboardShortcuts.verifyInventoryDropdownIsShown('true');
    InventoryKeyboardShortcuts.openShortcuts();

    InventoryKeyboardShortcuts.waitModalLoading('Keyboard shortcuts');
    InventoryKeyboardShortcuts.verifyInventoryDropdownIsShown('false');
  });

  it('C345298 Keyboard Shortcut. Test the functionality of the different shortcut keys', { tags: [testTypes.smoke, testTypes.broken] }, () => {
    InventoryKeyboardShortcuts.verifyInventoryDropdownIsShown('false');

    InventoryKeyboardShortcuts.openInventoryMenu();
    InventoryKeyboardShortcuts.openShortcuts();

    InventoryKeyboardShortcuts.waitModalLoading('Keyboard shortcuts');
    InventoryKeyboardShortcuts.pressHotKey(hotKeys.create);
    InventoryKeyboardShortcuts.closeShortcuts();
    InventoryKeyboardShortcuts.fillInstanceInfoAndSave(instanceTitle);
    // TODO: Need to wait for the loading of saving the edited information.Reason: the robot runs quickly and the test drops.
    cy.wait(6000);
    InventoryKeyboardShortcuts.checkInstance(instanceTitle);
    SearchInventory.searchInstanceByTitle(instanceTitle);
    InventoryInstances.selectInstance();
    InventoryKeyboardShortcuts.pressHotKey(hotKeys.openShortcutsModal);
    InventoryKeyboardShortcuts.waitModalLoading('Keyboard shortcuts');
    InventoryKeyboardShortcuts.pressHotKey(hotKeys.close);
    InventoryKeyboardShortcuts.pressHotKey(hotKeys.duplicate);
    InventoryInstanceEdit.addPrecedingTitle(0, precedingTitleValue, isbnValue, issnValue);
    InventoryKeyboardShortcuts.pressHotKey(hotKeys.save);
    InventoryInstance.checkPrecedingTitle(0, precedingTitleValue, isbnValue, issnValue);
  });
});
