import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHotkeys from '../../../support/fragments/inventory/inventoryHotkeys';
import InventoryKeyboardShortcuts from '../../../support/fragments/inventory/inventoryKeyboardShortcuts';
import InteractorsTools from '../../../support/utils/interactorsTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('Inventory', () => {
  describe('Keyboard shortcut (NEW)', () => {
    const testData = {
      instanceTitle: `AT_C476698_MarcBibInstance_${getRandomPostfix()}`,
      tag245: '245',
      tag008: '008',
    };
    const permissionCalloutText = 'You do not have permission to edit the record.';
    const marcInstanceFields = [
      {
        tag: testData.tag008,
        content: QuickMarcEditor.valid008ValuesInstance,
      },
      {
        tag: testData.tag245,
        content: `$a ${testData.instanceTitle}`,
        indicators: ['1', '1'],
      },
    ];
    let createdRecordId;
    let userC476698;
    let userC476699;

    before('Creating data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
        (createdUserProperties) => {
          userC476698 = createdUserProperties;
        },
      );
      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((createdUserProperties) => {
        userC476699 = createdUserProperties;
      });
      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
        (instanceId) => {
          createdRecordId = instanceId;
        },
      );
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userC476698.userId);
      Users.deleteViaApi(userC476699.userId);
      InventoryInstance.deleteInstanceViaApi(createdRecordId);
    });

    it(
      'C476698 Windows | Permission error is shown when user without edit permission uses shortcut "Ctrl + Shift + E" on the detail view pane of Instance with source "MARC" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C476698'] },
      () => {
        cy.login(userC476698.username, userC476698.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();

        InventoryInstances.searchByTitle(createdRecordId);
        InventoryInstances.selectInstanceById(createdRecordId);
        InventoryInstance.waitInstanceRecordViewOpened();

        InventoryKeyboardShortcuts.pressHotKey(InventoryHotkeys.hotKeys.editMarc);
        InteractorsTools.checkCalloutErrorMessage(permissionCalloutText);
        InventoryInstance.waitInstanceRecordViewOpened();
        InventorySearchAndFilter.waitLoading();
      },
    );

    it(
      'C476699 Windows | Permission error is shown when user without edit permission uses shortcut "Ctrl + Shift + E" on the view source pane of Instance with source "MARC" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C476699'] },
      () => {
        cy.login(userC476699.username, userC476699.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.instanceTabIsDefault();

        InventoryInstances.searchByTitle(createdRecordId);
        InventoryInstances.selectInstanceById(createdRecordId);
        InventoryInstance.waitLoading();

        InventoryInstance.viewSource();
        InventoryViewSource.waitInstanceLoading();
        InventoryViewSource.contains(createdRecordId);
        InventoryViewSource.checkActionsButtonEnabled();

        InventoryKeyboardShortcuts.pressHotKey(InventoryHotkeys.hotKeys.editMarc);
        InteractorsTools.checkCalloutErrorMessage(permissionCalloutText);
        InventoryViewSource.waitInstanceLoading();
      },
    );
  });
});
