import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHotkeys from '../../../support/fragments/inventory/inventoryHotkeys';
import InventoryKeyboardShortcuts from '../../../support/fragments/inventory/inventoryKeyboardShortcuts';

describe('Inventory', () => {
  describe('Keyboard shortcut (NEW)', () => {
    const testData = {
      instanceTitle: `AT_C476695_MarcBibInstance_${getRandomPostfix()}`,
      tag245: '245',
      tag008: '008',
    };
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
    const updatedTitle = `${testData.instanceTitle} UPD`;
    const paneHeaderEditRecord = /Edit .*MARC record/;
    let createdRecordId;
    let user;

    before('Creating data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((createdUserProperties) => {
        user = createdUserProperties;
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            createdRecordId = instanceId;
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
      'C476695 Windows | "Edit MARC record" page is opened when user with edit permission uses shortcut "Ctrl + Shift + E" on the detail view pane of Instance with source "MARC" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C476695'] },
      () => {
        InventoryInstances.searchByTitle(createdRecordId);
        InventoryInstances.selectInstanceById(createdRecordId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        InventoryKeyboardShortcuts.pressHotKey(InventoryHotkeys.hotKeys.editMarc);
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkPaneheaderContains(paneHeaderEditRecord);

        QuickMarcEditor.updateExistingField(testData.tag245, `$a ${updatedTitle}`);

        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
        InstanceRecordView.verifyInstanceIsOpened(updatedTitle);
      },
    );
  });
});
