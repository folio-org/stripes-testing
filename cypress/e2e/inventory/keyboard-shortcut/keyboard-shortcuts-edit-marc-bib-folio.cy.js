import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHotkeys from '../../../support/fragments/inventory/inventoryHotkeys';
import InventoryKeyboardShortcuts from '../../../support/fragments/inventory/inventoryKeyboardShortcuts';

describe('Inventory', () => {
  describe('Keyboard shortcut (NEW)', () => {
    const testData = {
      instanceTitle: `AT_C476697_FolioInstance_${getRandomPostfix()}`,
    };
    let createdRecordId;
    let user;

    before('Creating data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;
        InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
          ({ instanceData }) => {
            createdRecordId = instanceData.instanceId;
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventorySearchAndFilter.validateSearchTabIsDefault();
            InventorySearchAndFilter.instanceTabIsDefault();
          },
        );
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstance.deleteInstanceViaApi(createdRecordId);
    });

    it(
      'C476697 Windows | Nothing happens when user with edit permission uses shortcut "Ctrl + Shift + E" on the detail view pane of Instance with source "FOLIO" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C476697'] },
      () => {
        InventoryInstances.searchByTitle(createdRecordId);
        InventoryInstances.selectInstanceById(createdRecordId);
        InventoryInstance.waitLoading();

        InventoryKeyboardShortcuts.pressHotKey(InventoryHotkeys.hotKeys.editMarc);
        cy.wait(3000); // wait to ensure that nothing happens
        InventoryInstance.waitLoading();
        InventorySearchAndFilter.waitLoading();
      },
    );
  });
});
