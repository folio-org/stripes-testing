import TopMenu from '../../../support/fragments/topMenu';
import InventoryKeyboardShortcuts from '../../../support/fragments/inventory/inventoryKeyboardShortcuts';
import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHotkeys from '../../../support/fragments/inventory/inventoryHotkeys';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';

let userId;
const precedingTitleValue = `Preceding title test value ${getRandomPostfix()}`;
const isbnValue = `ISBN test value ${getRandomPostfix()}`;
const issnValue = `ISSN test value ${getRandomPostfix()}`;
const hotKeys = InventoryHotkeys.hotKeys;
const instanceTitle = `Instance_Test_Title_${getRandomPostfix()}`;

describe('Inventory', () => {
  describe('Keyboard shortcut (NEW)', () => {
    beforeEach('navigate to inventory', () => {
      cy.getAdminToken();
      cy.createTempUser([permissions.inventoryAll.gui]).then((userProperties) => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    afterEach('Delete all data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userId);
    });

    it(
      'C345297 Keyboard Shortcut. Access to drop down menu (thunderjet)',
      { tags: ['smoke', 'thunderjet', 'C345297'] },
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
      { tags: ['smoke', 'thunderjet', 'C345298'] },
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
        InventoryInstance.checkPrecedingTitle(precedingTitleValue, isbnValue, issnValue);
      },
    );
  });
});
