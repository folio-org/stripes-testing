import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import InventoryKeyboardShortcuts from '../../support/fragments/inventory/inventoryKeyboardShortcuts';
import permissions from '../../support/dictionary/permissions';
import getRandomPostfix from '../../support/utils/stringTools';
import InstanceRecordEdit from '../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryHotkeys from '../../support/fragments/inventory/inventoryHotkeys';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import devTeams from '../../support/dictionary/devTeams';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Users from '../../support/fragments/users/users';

let userId;
const precedingTitleValue = `Preceding title test value ${getRandomPostfix()}`;
const isbnValue = `ISBN test value ${getRandomPostfix()}`;
const issnValue = `ISSN test value ${getRandomPostfix()}`;
const hotKeys = InventoryHotkeys.hotKeys;
const instanceTitle = `Instance_Test_Title_${getRandomPostfix()}`;

describe('ui-inventory: Keyboard shortcut (NEW)', () => {
  beforeEach('navigate to inventory', () => {
    cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
    });
    cy.visit(TopMenu.inventoryPath);
  });

  afterEach('Delete all data', () => {
    Users.deleteViaApi(userId);
  });

  it(
    'C345297 Keyboard Shortcut. Access to drop down menu (folijet)',
    { tags: [testTypes.smoke, devTeams.thunderjet] },
    () => {
      InventoryKeyboardShortcuts.verifyInventoryDropdownIsShown('false');

      InventoryKeyboardShortcuts.openInventoryMenu();
      InventoryKeyboardShortcuts.verifyInventoryDropdownIsShown('true');
      InventoryKeyboardShortcuts.openShortcuts();

      InventoryKeyboardShortcuts.waitModalLoading('Keyboard shortcuts');
      InventoryKeyboardShortcuts.verifyInventoryDropdownIsShown('false');
    },
  );

  it(
    'C345298 Keyboard Shortcut. Test the functionality of the different shortcut keys (thunderjet)',
    { tags: [testTypes.smoke, devTeams.thunderjet, testTypes.broken] },
    () => {
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
      InventorySearchAndFilter.searchInstanceByTitle(instanceTitle);
      InventoryInstances.selectInstance();
      InventoryKeyboardShortcuts.pressHotKey(hotKeys.openShortcutsModal);
      InventoryKeyboardShortcuts.waitModalLoading('Keyboard shortcuts');
      InventoryKeyboardShortcuts.pressHotKey(hotKeys.close);
      InventoryKeyboardShortcuts.pressHotKey(hotKeys.duplicate);
      InstanceRecordEdit.addPrecedingTitle(0, precedingTitleValue, isbnValue, issnValue);
      InventoryKeyboardShortcuts.pressHotKey(hotKeys.save);
      InventoryInstance.checkPrecedingTitle(0, precedingTitleValue, isbnValue, issnValue);
    },
  );
});
